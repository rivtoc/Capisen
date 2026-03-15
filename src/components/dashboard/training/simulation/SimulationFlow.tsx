import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, AlertTriangle, Users, FlaskConical } from "lucide-react";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import PhaseProgressBar from "./PhaseProgressBar";
import PhaseEvaluationCard from "./PhaseEvaluationCard";
import SummaryCard from "./SummaryCard";
import Phase1Prise from "./phases/Phase1Prise";
import Phase2Kickoff from "./phases/Phase2Kickoff";
import Phase3Suivi from "./phases/Phase3Suivi";
import Phase4Livraison from "./phases/Phase4Livraison";
import Phase5Cloture from "./phases/Phase5Cloture";
import { useTrainingSession } from "@/hooks/useTrainingSession";
import { useMultiplayerPolling } from "@/hooks/useMultiplayerPolling";
import type { PhaseNumber, PhaseEvaluation, ChatMessage, ClientMode } from "@/lib/training-types";

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "http://localhost:3001";

const SECTORS = [
  "Numérique & IT", "Industrie", "Santé", "Finance", "Commerce & Distribution",
  "Agroalimentaire", "Énergie", "Transport & Logistique", "Conseil", "Éducation",
];

const PHASE_LABELS: Record<PhaseNumber, string> = {
  1: "Prise de contact",
  2: "Réunion de lancement",
  3: "Suivi de mission",
  4: "Livraison",
  5: "Clôture",
};

type FlowState = "setup" | "generating" | "ready" | "phase" | "evaluating" | "summary";

export default function SimulationFlow() {
  const { profile } = useAuth();
  const { session, updateSession, clearSession } = useTrainingSession();
  const [flowState, setFlowState] = useState<FlowState>(
    session.brief ? (session.currentPhase === "summary" ? "summary" : "phase") : "setup"
  );
  const [sector, setSector] = useState("Numérique & IT");
  const [complexite, setComplexite] = useState<"debutant" | "intermediaire" | "expert">("intermediaire");
  const [clientMode, setClientMode] = useState<ClientMode>("ai");
  const [memberNameInput, setMemberNameInput] = useState("");
  const [showMemberDialog, setShowMemberDialog] = useState(false);
  const [pendingEvaluation, setPendingEvaluation] = useState<PhaseEvaluation | null>(null);
  const [loadingBrief, setLoadingBrief] = useState(false);
  const [loadingEval, setLoadingEval] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Multiplayer polling (member mode, phase 2)
  const isMultiplayerPhase2 =
    clientMode === "member" &&
    session.currentPhase === 2 &&
    session.multiplayerSessionId !== null;

  const { messages: polledMessages } = useMultiplayerPolling(
    session.multiplayerSessionId,
    isMultiplayerPhase2
  );

  // Merge polled messages into session (deduplicated by timestamp)
  if (isMultiplayerPhase2 && polledMessages.length > session.chatHistory.length) {
    updateSession({ chatHistory: polledMessages });
  }

  const generateBrief = async () => {
    setLoadingBrief(true);
    setFlowState("generating");
    setError(null);
    try {
      const res = await fetch(`${SERVER_URL}/api/training/generate-brief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secteur: sector, complexite }),
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const brief = await res.json();

      // If member mode, create multiplayer session
      let multiplayerSessionId: string | null = null;
      if (clientMode === "member") {
        const sessionRes = await fetch(`${SERVER_URL}/api/training/session/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ brief }),
        });
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          multiplayerSessionId = sessionData.sessionId;
        }
      }

      updateSession({
        mode: "simulation",
        clientMode,
        brief,
        currentPhase: 1,
        responses: {},
        evaluations: {},
        chatHistory: [],
        multiplayerSessionId,
        memberClientName: clientMode === "member" ? memberNameInput || null : null,
        startedAt: new Date().toISOString(),
      });
      setFlowState("phase");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de la génération");
      setFlowState("setup");
    } finally {
      setLoadingBrief(false);
    }
  };

  const handleStartWithMemberMode = () => {
    if (clientMode === "member") {
      setShowMemberDialog(true);
    } else {
      generateBrief();
    }
  };

  const confirmMemberName = () => {
    setShowMemberDialog(false);
    generateBrief();
  };

  const submitPhaseResponse = async (response: string) => {
    if (!session.brief || session.currentPhase === "summary") return;
    const phase = session.currentPhase as PhaseNumber;
    setLoadingEval(true);
    setFlowState("evaluating");
    setError(null);
    try {
      const res = await fetch(`${SERVER_URL}/api/training/evaluate-phase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phaseNumber: phase,
          brief: session.brief,
          response,
          chatHistory: phase === 2 ? session.chatHistory : undefined,
        }),
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const evaluation = await res.json();
      const newEvaluations = { ...session.evaluations, [phase]: evaluation };
      const newResponses = { ...session.responses, [phase]: response };
      updateSession({ evaluations: newEvaluations, responses: newResponses });
      setPendingEvaluation(evaluation);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'évaluation");
      setFlowState("phase");
    } finally {
      setLoadingEval(false);
    }
  };

  const handleNextPhase = () => {
    setPendingEvaluation(null);
    const current = session.currentPhase as PhaseNumber;
    if (current < 5) {
      updateSession({ currentPhase: (current + 1) as PhaseNumber });
      setFlowState("phase");
    } else {
      // Sauvegarde en BDD avant d'afficher le résumé
      if (profile && session.brief) {
        const phases: PhaseNumber[] = [1, 2, 3, 4, 5];
        const avg = phases.reduce((s, p) => s + (session.evaluations[p]?.note ?? 0), 0) / 5;
        supabase.from("training_simulations").insert({
          member_id: profile.id,
          sector: session.brief.secteur,
          complexity: session.brief.complexite,
          brief_client: session.brief.client,
          evaluations: session.evaluations,
          average_score: Math.round(avg * 100) / 100,
        });
      }
      updateSession({ currentPhase: "summary" });
      setFlowState("summary");
    }
  };

  const handleNewChat = (msg: ChatMessage) => {
    updateSession({ chatHistory: [...session.chatHistory, msg] });
  };

  const handleRestart = () => {
    clearSession();
    setFlowState("setup");
    setPendingEvaluation(null);
    setError(null);
  };

  const completedPhases = Object.keys(session.evaluations).map(Number) as PhaseNumber[];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Étude blanche</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Simulation complète du rôle de Suiveur d'Étude
          </p>
        </div>
        {session.brief && flowState !== "setup" && (
          <Button variant="outline" size="sm" onClick={handleRestart} className="text-xs">
            Nouvelle simulation
          </Button>
        )}
      </div>

      {/* Progress bar (during active simulation) */}
      {session.brief && flowState !== "setup" && flowState !== "generating" && flowState !== "summary" && (
        <PhaseProgressBar
          currentPhase={session.currentPhase === "summary" ? 5 : (session.currentPhase as PhaseNumber)}
          completedPhases={completedPhases}
        />
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-4 flex items-center gap-3">
          <AlertTriangle size={14} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400 flex-1">{error}</p>
          <Button size="sm" variant="outline" onClick={() => setError(null)}>
            Fermer
          </Button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* SETUP */}
        {flowState === "setup" && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-border bg-card p-6 space-y-5"
          >
            <div className="flex items-center gap-2 mb-2">
              <FlaskConical size={15} className="text-primary" />
              <p className="text-sm font-semibold text-foreground">Paramètres de la simulation</p>
            </div>

            {/* Sector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Secteur d'activité</label>
              <CustomSelect
                value={sector}
                options={SECTORS.map((s) => ({ value: s, label: s }))}
                onChange={setSector}
              />
            </div>

            {/* Difficulty */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Difficulté</label>
              <div className="grid grid-cols-3 gap-2">
                {(["debutant", "intermediaire", "expert"] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setComplexite(d)}
                    className={`px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                      complexite === d
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                    }`}
                  >
                    {d === "debutant" ? "Débutant" : d === "intermediaire" ? "Intermédiaire" : "Expert"}
                  </button>
                ))}
              </div>
            </div>

            {/* Client mode */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Mode client</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setClientMode("ai")}
                  className={`px-3 py-2.5 rounded-lg border text-xs font-medium text-left transition-colors ${
                    clientMode === "ai"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  }`}
                >
                  <div className="font-semibold mb-0.5">🤖 IA</div>
                  <div className="text-[11px] opacity-80">ChatGPT joue le client</div>
                </button>
                <button
                  onClick={() => setClientMode("member")}
                  className={`px-3 py-2.5 rounded-lg border text-xs font-medium text-left transition-colors ${
                    clientMode === "member"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  }`}
                >
                  <div className="font-semibold mb-0.5 flex items-center gap-1">
                    <Users size={11} /> Membre
                  </div>
                  <div className="text-[11px] opacity-80">Un membre joue le client</div>
                </button>
              </div>
            </div>

            <Button onClick={handleStartWithMemberMode} className="w-full gap-2" disabled={loadingBrief}>
              {loadingBrief ? <Loader2 size={14} className="animate-spin" /> : <FlaskConical size={14} />}
              Générer le brief
            </Button>
          </motion.div>
        )}

        {/* GENERATING */}
        {flowState === "generating" && (
          <motion.div
            key="generating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-border bg-card p-6 space-y-3"
          >
            <div className="flex items-center gap-3">
              <Loader2 size={16} className="animate-spin text-primary" />
              <p className="text-sm font-medium text-foreground">Génération du brief en cours…</p>
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-3/5" />
          </motion.div>
        )}

        {/* PHASE */}
        {(flowState === "phase" || flowState === "evaluating") && session.brief && session.currentPhase !== "summary" && (
          <motion.div
            key={`phase-${session.currentPhase}`}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            className="space-y-4"
          >
            {/* Brief context */}
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">Brief — {session.brief.client}</p>
              <p className="text-sm text-foreground font-medium">{session.brief.contact}</p>
              <p className="text-xs text-muted-foreground">{session.brief.problematique}</p>
            </div>

            {/* Show evaluation or phase */}
            {pendingEvaluation ? (
              <PhaseEvaluationCard
                evaluation={pendingEvaluation}
                phaseLabel={PHASE_LABELS[session.currentPhase as PhaseNumber]}
                onNext={handleNextPhase}
                nextLabel={session.currentPhase === 5 ? "Voir le bilan →" : "Phase suivante →"}
              />
            ) : (
              <>
                {session.currentPhase === 1 && (
                  <Phase1Prise brief={session.brief} onSubmit={submitPhaseResponse} loading={loadingEval} />
                )}
                {session.currentPhase === 2 && (
                  <Phase2Kickoff
                    brief={session.brief}
                    chatHistory={session.chatHistory}
                    clientMode={session.clientMode}
                    sessionId={session.multiplayerSessionId}
                    onNewMessage={handleNewChat}
                    onSubmit={submitPhaseResponse}
                    loading={loadingEval}
                  />
                )}
                {session.currentPhase === 3 && (
                  <Phase3Suivi brief={session.brief} onSubmit={submitPhaseResponse} loading={loadingEval} />
                )}
                {session.currentPhase === 4 && (
                  <Phase4Livraison brief={session.brief} onSubmit={submitPhaseResponse} loading={loadingEval} />
                )}
                {session.currentPhase === 5 && (
                  <Phase5Cloture brief={session.brief} onSubmit={submitPhaseResponse} loading={loadingEval} />
                )}
              </>
            )}
          </motion.div>
        )}

        {/* SUMMARY */}
        {(flowState === "summary" || session.currentPhase === "summary") && session.brief && (
          <motion.div
            key="summary"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <SummaryCard
              evaluations={session.evaluations}
              brief={session.brief}
              onRestart={handleRestart}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Member name dialog */}
      <Dialog open={showMemberDialog} onOpenChange={setShowMemberDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mode membre</DialogTitle>
            <DialogDescription>
              Entrez le nom du membre CAPISEN qui jouera le rôle du client. Il recevra un lien pour
              rejoindre la session.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              placeholder="Prénom Nom du membre"
              value={memberNameInput}
              onChange={(e) => setMemberNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmMemberName()}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowMemberDialog(false)}>
                Annuler
              </Button>
              <Button onClick={confirmMemberName}>
                Générer le brief →
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
