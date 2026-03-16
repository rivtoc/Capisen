export type SimulationMode = "simulation" | "scenario";
export type ClientMode = "ai" | "member";
export type PhaseNumber = 1 | 2 | 3 | 4 | 5;
export type CrisisType =
  | "intervenant_decroche"
  | "scope_creep"
  | "client_mecontent"
  | "retard_phase"
  | "conflit_contact";

export interface TrainingBrief {
  client: string;
  secteur: string;
  prestation?: string;
  contact: string;
  contexte: string;           // contexte détaillé de l'entreprise (3-5 phrases)
  problematique: string;      // problème concret (2-3 phrases)
  objectifs?: string[];        // objectifs spécifiques attendus (3-5 items)
  cahier_des_charges: string[];
  contraintes?: string[];      // contraintes techniques/budget/délai/org
  ressources_client?: string;  // ce que le client met à disposition
  criteres_succes?: string[];  // comment le client évaluera la réussite
  budget_jeh: number;
  duree_semaines: number;
  type_livrable: "informatique" | "papier";
  complexite: "debutant" | "intermediaire" | "expert";
  pieges: string[];
}

export interface EvaluationCritere {
  nom: string;
  points: number;
  feedback: string;
}

export interface PhaseEvaluation {
  note: number;
  verdict: string;
  criteres: EvaluationCritere[];
  reponse_ideale: string;
  point_fort: string;
  a_ameliorer: string;
}

export interface ChatMessage {
  role: "suiveur" | "client";
  content: string;
  timestamp: string;
}

export interface TrainingSession {
  simulationId: string | null;
  mode: SimulationMode | null;
  clientMode: ClientMode;
  multiplayerSessionId: string | null;
  memberClientName: string | null;
  brief: TrainingBrief | null;
  currentPhase: PhaseNumber | "summary";
  responses: Partial<Record<PhaseNumber, string>>;
  evaluations: Partial<Record<PhaseNumber, PhaseEvaluation>>;
  chatHistory: ChatMessage[];
  scenario: { type: CrisisType; description: string } | null;
  scenarioResponse: string | null;
  scenarioEvaluation: PhaseEvaluation | null;
  startedAt: string;
}

// Server-side only
export interface MultiplayerSession {
  id: string;
  brief: TrainingBrief;
  messages: ChatMessage[];
  createdAt: Date;
  lastActivity: Date;
}
