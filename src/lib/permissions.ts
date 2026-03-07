/**
 * Système de permissions granulaires.
 *
 * Les rôles définissent un accès de base :
 *   - presidence  → tout
 *   - responsable → supervision + formations + étude/clients si pôle compatible
 *   - normal      → formations + étude/clients si pôle compatible
 *   - apprenti    → formations uniquement
 *
 * La colonne `permissions text[]` sur profiles permet d'étendre l'accès
 * d'un utilisateur feature par feature, quel que soit son rôle.
 */

import type { UserProfile } from "@/contexts/AuthContext";

// Pôles qui ont accès aux études/clients sans permission explicite
const ETUDES_POLES = ["presidence", "etude", "qualite"] as const;

// Liste des features qu'on peut accorder individuellement
export const FEATURES = ["mails", "etudes", "clients", "supervision"] as const;
export type Feature = (typeof FEATURES)[number];

export const FEATURE_LABELS: Record<Feature, string> = {
  mails:       "Mails",
  etudes:      "Études",
  clients:     "Clients",
  supervision: "Supervision",
};

/**
 * Retourne true si le profil a accès à la feature demandée.
 * Prend en compte rôle + pôle + permissions explicites.
 */
export function canAccess(profile: UserProfile | null, feature: Feature): boolean {
  if (!profile) return false;

  // Présidence → accès total
  if (profile.role === "presidence") return true;

  const perms: string[] = profile.permissions ?? [];

  switch (feature) {
    case "supervision":
      // responsable a supervision de base ; sinon permission explicite
      return profile.role === "responsable" || perms.includes("supervision");

    case "mails":
      // réservé présidence de base (gère ses propres permissions si délégué)
      return perms.includes("mails");

    case "etudes":
      // pôles étude/qualité/présidence de base ; ou permission explicite
      return (ETUDES_POLES as readonly string[]).includes(profile.pole)
        || perms.includes("etudes");

    case "clients":
      return (ETUDES_POLES as readonly string[]).includes(profile.pole)
        || perms.includes("clients");
  }
}
