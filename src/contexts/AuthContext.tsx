import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";
import type { MemberRole, PoleType } from "@/lib/db-types";

export interface UserProfile {
  id: string;
  full_name: string;
  pole: PoleType;
  role: MemberRole;
  avatar_url: string | null;
  bio: string | null;
  position: string | null;
  linkedin_url: string | null;
  permissions: string[] | null;
  rib_url: string | null;
}

export interface ClientRecord {
  id: string;
  full_name: string;
  email: string;
  company_name: string;
  is_active: boolean;
}

export type UserType = "member" | "client" | null;

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  clientRecord: ClientRecord | null;
  userType: UserType;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 1 heure en millisecondes
const ACTIVITY_KEY = "capisen_last_activity";
const CHECK_INTERVAL = 60 * 1000; // vérification toutes les minutes

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  profile: null,
  clientRecord: null,
  userType: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [clientRecord, setClientRecord] = useState<ClientRecord | null>(null);
  const [userType, setUserType] = useState<UserType>(null);
  const [loading, setLoading] = useState(true);
  const sessionRef = useRef<Session | null>(null);
  const inactivityTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Garde sessionRef à jour pour les closures des event listeners
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const fetchUserIdentity = async (user: User) => {
    // 1. Cherche dans profiles (membres internes)
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileData) {
      setProfile(profileData as UserProfile);
      setClientRecord(null);
      setUserType("member");
      return;
    }

    // 2. Pas de profil — vérifier si c'est un client (metadata.is_client)
    if (user.user_metadata?.is_client === true) {
      const { data: clientData } = await supabase
        .from("clients")
        .select("*")
        .eq("id", user.id)
        .single();

      // userType = "client" dès que le metadata le dit,
      // même si la requête clients échoue (RLS manquante, etc.)
      setClientRecord(clientData as ClientRecord | null);
      setProfile(null);
      setUserType("client");
      return;
    }

    // 3. Nouveau membre (premier login après confirmation) : créer le profil
    if (user.email_confirmed_at && !user.user_metadata?.is_client) {
      const meta = user.user_metadata ?? {};
      const { data: created } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          full_name: meta.full_name ?? "",
          pole: meta.pole ?? "nouveau",
          role: "normal",
        })
        .select()
        .single();
      setProfile(created as UserProfile | null);
      setClientRecord(null);
      setUserType("member");
    }
  };

  const refreshProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await fetchUserIdentity(user);
  };

  const signOut = async () => {
    localStorage.removeItem(ACTIVITY_KEY);
    await supabase.auth.signOut();
  };

  // Met à jour le timestamp d'activité
  const updateActivity = () => {
    localStorage.setItem(ACTIVITY_KEY, Date.now().toString());
  };

  // Démarre la surveillance d'inactivité (sans réinitialiser le timestamp au démarrage)
  const startInactivityWatch = () => {
    const activityEvents = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
    activityEvents.forEach((event) =>
      window.addEventListener(event, updateActivity, { passive: true })
    );

    inactivityTimer.current = setInterval(() => {
      if (!sessionRef.current) return;

      const lastActivity = parseInt(localStorage.getItem(ACTIVITY_KEY) ?? "0", 10);
      if (lastActivity > 0 && Date.now() - lastActivity > INACTIVITY_TIMEOUT) {
        localStorage.removeItem(ACTIVITY_KEY);
        supabase.auth.signOut();
      }
    }, CHECK_INTERVAL);

    return () => {
      activityEvents.forEach((event) =>
        window.removeEventListener(event, updateActivity)
      );
      if (inactivityTimer.current) clearInterval(inactivityTimer.current);
    };
  };

  useEffect(() => {
    // Utiliser onAuthStateChange comme source de vérité unique.
    // L'événement INITIAL_SESSION se déclenche après que Supabase a traité
    // les tokens du hash d'URL (liens d'invitation, reset de mot de passe…),
    // ce qui évite la race condition avec getSession() qui retourne null
    // avant que le hash soit traité.
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        // Au démarrage, vérifier si la session est expirée par inactivité
        // AVANT de réinitialiser le timestamp (bug : updateActivity au mount écrasait la vérif)
        if (event === "INITIAL_SESSION") {
          const lastActivity = parseInt(localStorage.getItem(ACTIVITY_KEY) ?? "0", 10);
          // Si la clé est absente (= 0) OU si l'inactivité dépasse le timeout → déconnexion
          // Note: lastActivity === 0 couvre le cas où la clé a été supprimée lors d'une
          // déconnexion par inactivité précédente, ce qui empêchait le re-login silencieux.
          if (lastActivity === 0 || Date.now() - lastActivity > INACTIVITY_TIMEOUT) {
            localStorage.removeItem(ACTIVITY_KEY);
            supabase.auth.signOut();
            setLoading(false);
            return;
          }
          // Session valide → on enregistre l'activité maintenant
          updateActivity();
        }

        // Login actif → on enregistre immédiatement l'activité
        if (event === "SIGNED_IN") {
          updateActivity();
        }

        setSession(session);
        fetchUserIdentity(session.user).finally(() => {
          if (event === "INITIAL_SESSION") setLoading(false);
        });
      } else {
        setSession(null);
        setProfile(null);
        setClientRecord(null);
        setUserType(null);
        if (event === "SIGNED_OUT") localStorage.removeItem(ACTIVITY_KEY);
        if (event === "INITIAL_SESSION") setLoading(false);
      }
    });

    const stopWatch = startInactivityWatch();

    return () => {
      listener.subscription.unsubscribe();
      stopWatch();
    };
  }, []);

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      profile,
      clientRecord,
      userType,
      loading,
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
