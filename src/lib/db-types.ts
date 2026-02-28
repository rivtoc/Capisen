// Miroir des types Supabase — à synchroniser si la BDD évolue

export const POLE_OPTIONS = [
  { value: "secretariat",   label: "Secrétariat" },
  { value: "tresorerie",    label: "Trésorerie" },
  { value: "rh_event",      label: "RH & Événements" },
  { value: "communication", label: "Communication" },
  { value: "etude",         label: "Étude" },
  { value: "qualite",       label: "Qualité" },
  { value: "presidence",    label: "Présidence" },
] as const;

export type PoleType = (typeof POLE_OPTIONS)[number]["value"];

export const MEMBER_ROLES = ["normal", "responsable", "presidence"] as const;

export type MemberRole = (typeof MEMBER_ROLES)[number];
