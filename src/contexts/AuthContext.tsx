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
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 1 heure en millisecondes
const ACTIVITY_KEY = "capisen_last_activity";
const CHECK_INTERVAL = 60 * 1000; // vérification toutes les minutes

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionRef = useRef<Session | null>(null);
  const inactivityTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Garde sessionRef à jour pour les closures des event listeners
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const fetchProfile = async (user: User) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!data && user.email_confirmed_at) {
      // Premier login après confirmation : créer le profil depuis les métadonnées
      const meta = user.user_metadata ?? {};
      const { data: created } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          full_name: meta.full_name ?? "",
          pole: meta.pole ?? "secretariat",
          role: "normal",
        })
        .select()
        .single();
      setProfile(created as UserProfile | null);
    } else {
      setProfile(data as UserProfile | null);
    }
  };

  const signOut = async () => {
    localStorage.removeItem(ACTIVITY_KEY);
    await supabase.auth.signOut();
  };

  // Met à jour le timestamp d'activité
  const updateActivity = () => {
    localStorage.setItem(ACTIVITY_KEY, Date.now().toString());
  };

  // Démarre la surveillance d'inactivité
  const startInactivityWatch = () => {
    updateActivity();

    const activityEvents = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
    activityEvents.forEach((event) =>
      window.addEventListener(event, updateActivity, { passive: true })
    );

    inactivityTimer.current = setInterval(() => {
      if (!sessionRef.current) return; // pas connecté, rien à faire

      const lastActivity = parseInt(localStorage.getItem(ACTIVITY_KEY) ?? "0", 10);
      const inactive = Date.now() - lastActivity > INACTIVITY_TIMEOUT;

      if (inactive) {
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
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        fetchProfile(data.session.user).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        setProfile(null);
        localStorage.removeItem(ACTIVITY_KEY);
      }
    });

    const stopWatch = startInactivityWatch();

    return () => {
      listener.subscription.unsubscribe();
      stopWatch();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
