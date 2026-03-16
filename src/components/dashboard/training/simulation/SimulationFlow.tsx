import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, AlertTriangle, Users, FlaskConical, ChevronDown, ChevronUp } from "lucide-react";
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

interface OffreItem {
  id: string;
  title: string;
  description: string | null;
  prestations: { id: string; title: string; description: string | null }[];
}

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
  const [offres, setOffres] = useState<OffreItem[]>([]);
  const [selectedOffreIds, setSelectedOffreIds] = useState<string[]>([]);
  const [selectedPrestationIds, setSelectedPrestationIds] = useState<string[]>([]);
  const [complexite, setComplexite] = useState<"debutant" | "intermediaire" | "expert">("intermediaire");
  const [clientMode, setClientMode] = useState<ClientMode>("ai");
  const [memberNameInput, setMemberNameInput] = useState("");
  const [showMemberDialog, setShowMemberDialog] = useState(false);
  const [pendingEvaluation, setPendingEvaluation] = useState<PhaseEvaluation | null>(null);
  const [loadingBrief, setLoadingBrief] = useState(false);
  const [loadingEval, setLoadingEval] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewingPhase, setViewingPhase] = useState<PhaseNumber | null>(null);
  const [briefExpanded, setBriefExpanded] = useState(false);

  // Load offres + prestations from Supabase
  useEffect(() => {
    Promise.all([
      supabase.from("offres_prestation").select("*").order("title"),
      supabase.from("prestations").select("*").order("title"),
    ]).then(([{ data: offresData }, { data: prestData }]) => {
      const result: OffreItem[] = (offresData ?? []).map((o) => ({
        ...o,
        prestations: (prestData ?? []).filter((p) => p.offre_id === o.id),
      }));
      setOffres(result);
    });
  }, []);

  const toggleOffre = (id: string) => {
    setSelectedOffreIds((prev) => {
      if (prev.includes(id)) {
        // Désélectionner l'offre + retirer ses prestations
        const offrePrestIds = offres.find((o) => o.id === id)?.prestations.map((p) => p.id) ?? [];
        setSelectedPrestationIds((pp) => pp.filter((pid) => !offrePrestIds.includes(pid)));
        return prev.filter((oid) => oid !== id);
      }
      return [...prev, id];
    });
  };

  const togglePrestation = (id: string) => {
    setSelectedPrestationIds((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  };

  // Load in-progress simulation from DB on mount (if no brief in local session)
  useEffect(() => {
    if (session.brief) return; // already have local session
    if (!profile) return;
    supabase
      .from("training_simulations")
      .select("*")
      .eq("member_id", profile.id)
      .eq("status", "in_progress")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (!data) return;
        updateSession({
          simulationId: data.id,
          brief: data.brief,
          currentPhase: Math.min(data.current_phase, 5) as PhaseNumber,
          responses: data.responses ?? {},
          evaluations: data.evaluations ?? {},
          mode: "simulation",
          clientMode: "ai",
          multiplayerSessionId: null,
          memberClientName: null,
          chatHistory: [],
          scenario: null,
          scenarioResponse: null,
          scenarioEvaluation: null,
          startedAt: data.started_at,
        });
        setFlowState("phase");
      });
  }, [profile?.id]);

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
    if (selectedOffreIds.length === 0) { setError("Veuillez sélectionner au moins une offre."); return; }

    const offresSelected = offres.filter((o) => selectedOffreIds.includes(o.id));
    const allPrestations = offresSelected.flatMap((o) =>
      o.prestations
        .filter((p) => selectedPrestationIds.includes(p.id))
        .map((p) => ({ titre: p.title, description: p.description, offre: o.title }))
    );

    setLoadingBrief(true);
    setFlowState("generating");
    setError(null);
    try {
      const res = await fetch(`${SERVER_URL}/api/training/generate-brief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offres: offresSelected.map((o) => ({ titre: o.title, description: o.description })),
          prestations: allPrestations,
          complexite,
        }),
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

      // Create DB record
      let simulationId: string | null = null;
      if (profile) {
        const { data: dbData, error: dbError } = await supabase
          .from("training_simulations")
          .insert({
            member_id: profile.id,
            sector: brief.secteur,
            complexity: brief.complexite,
            brief_client: brief.client,
            brief,
            current_phase: 1,
            responses: {},
            evaluations: {},
            status: "in_progress",
            started_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select("id")
          .single();
        if (dbError) console.error("[SimulationFlow] Erreur insert DB:", dbError);
        simulationId = dbData?.id ?? null;
      }

      updateSession({
        simulationId,
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

      // Background DB sync
      if (session.simulationId) {
        supabase.from("training_simulations").update({
          responses: newResponses,
          evaluations: newEvaluations,
          updated_at: new Date().toISOString(),
        }).eq("id", session.simulationId).then(() => {});
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'évaluation");
      setFlowState("phase");
    } finally {
      setLoadingEval(false);
    }
  };

  const handleNextPhase = () => {
    setPendingEvaluation(null);
    setViewingPhase(null);
    const current = session.currentPhase as PhaseNumber;
    if (current < 5) {
      updateSession({ currentPhase: (current + 1) as PhaseNumber });
      setFlowState("phase");

      // Background DB sync
      if (session.simulationId) {
        supabase.from("training_simulations").update({
          current_phase: current + 1,
          updated_at: new Date().toISOString(),
        }).eq("id", session.simulationId).then(() => {});
      }
    } else {
      const phases: PhaseNumber[] = [1, 2, 3, 4, 5];
      const avg = phases.reduce((s, p) => s + (session.evaluations[p]?.note ?? 0), 0) / 5;

      // Background DB sync — mark as completed
      if (session.simulationId) {
        supabase.from("training_simulations").update({
          status: "completed",
          current_phase: 6,
          average_score: Math.round(avg * 100) / 100,
          evaluations: session.evaluations,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", session.simulationId).then(() => {});
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
    setViewingPhase(null);
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
          onPhaseClick={(phase) => {
            setViewingPhase(phase);
            setFlowState("phase");
          }}
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

            {/* Offres — multi-sélection */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Offres CAPISEN{" "}
                <span className="text-muted-foreground font-normal">(plusieurs possibles)</span>
              </label>
              {offres.length === 0 ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 size={12} className="animate-spin" /> Chargement des offres…
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {offres.map((o) => {
                    const selected = selectedOffreIds.includes(o.id);
                    return (
                      <button
                        key={o.id}
                        onClick={() => toggleOffre(o.id)}
                        className={`px-3 py-2.5 rounded-lg border text-xs font-medium text-left transition-colors ${
                          selected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                        }`}
                      >
                        <div className="font-semibold leading-tight">{o.title}</div>
                        {o.description && (
                          <div className="text-[11px] opacity-70 mt-0.5 line-clamp-1">{o.description}</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Prestations — issues de toutes les offres sélectionnées */}
            {selectedOffreIds.length > 0 &&
              offres.filter((o) => selectedOffreIds.includes(o.id)).some((o) => o.prestations.length > 0) && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">
                  Prestations <span className="text-muted-foreground font-normal">(optionnel, plusieurs possibles)</span>
                </label>
                {offres
                  .filter((o) => selectedOffreIds.includes(o.id) && o.prestations.length > 0)
                  .map((o) => (
                    <div key={o.id} className="space-y-1.5">
                      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
                        {o.title}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {o.prestations.map((p) => {
                          const selected = selectedPrestationIds.includes(p.id);
                          return (
                            <button
                              key={p.id}
                              onClick={() => togglePrestation(p.id)}
                              className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                                selected
                                  ? "bg-primary/15 border-primary text-primary font-medium"
                                  : "bg-card border-border text-muted-foreground hover:bg-muted/40"
                              }`}
                            >
                              {p.title}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            )}

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
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              {/* En-tête cliquable */}
              <button
                onClick={() => setBriefExpanded((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors text-left"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Brief client</span>
                    {session.brief.prestation && (
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {session.brief.prestation}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-foreground truncate">{session.brief.client}</p>
                  <p className="text-xs text-muted-foreground">{session.brief.contact}</p>
                </div>
                {briefExpanded ? <ChevronUp size={14} className="text-muted-foreground shrink-0 ml-2" /> : <ChevronDown size={14} className="text-muted-foreground shrink-0 ml-2" />}
              </button>

              {/* Contenu détaillé */}
              {briefExpanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                  {/* Contexte */}
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Contexte</p>
                    <p className="text-xs text-foreground leading-relaxed">{session.brief.contexte}</p>
                  </div>

                  {/* Problématique */}
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Problématique</p>
                    <p className="text-xs text-foreground leading-relaxed">{session.brief.problematique}</p>
                  </div>

                  {/* Objectifs */}
                  {session.brief.objectifs?.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Objectifs</p>
                      <ul className="space-y-0.5">
                        {session.brief.objectifs.map((o, i) => (
                          <li key={i} className="text-xs text-foreground flex gap-1.5">
                            <span className="text-primary mt-0.5 shrink-0">•</span>{o}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Cahier des charges */}
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Livrables attendus</p>
                    <ul className="space-y-0.5">
                      {session.brief.cahier_des_charges.map((l, i) => (
                        <li key={i} className="text-xs text-foreground flex gap-1.5">
                          <span className="text-primary mt-0.5 shrink-0">•</span>{l}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Contraintes + ressources */}
                  <div className="grid grid-cols-2 gap-3">
                    {session.brief.contraintes?.length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Contraintes</p>
                        <ul className="space-y-0.5">
                          {session.brief.contraintes.map((c, i) => (
                            <li key={i} className="text-xs text-foreground flex gap-1.5">
                              <span className="text-amber-500 mt-0.5 shrink-0">⚠</span>{c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {session.brief.criteres_succes?.length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Critères de succès</p>
                        <ul className="space-y-0.5">
                          {session.brief.criteres_succes.map((c, i) => (
                            <li key={i} className="text-xs text-foreground flex gap-1.5">
                              <span className="text-green-500 mt-0.5 shrink-0">✓</span>{c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {session.brief.ressources_client && (
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Ressources client</p>
                      <p className="text-xs text-foreground leading-relaxed">{session.brief.ressources_client}</p>
                    </div>
                  )}

                  {/* Budget / Durée */}
                  <div className="flex gap-4 pt-1 border-t border-border">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Budget</p>
                      <p className="text-xs font-semibold text-foreground">{session.brief.budget_jeh} JEH</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Durée</p>
                      <p className="text-xs font-semibold text-foreground">{session.brief.duree_semaines} semaines</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Livrable</p>
                      <p className="text-xs font-semibold text-foreground capitalize">{session.brief.type_livrable}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Résumé compact quand fermé */}
              {!briefExpanded && (
                <div className="px-4 pb-3">
                  <p className="text-xs text-muted-foreground line-clamp-2">{session.brief.problematique}</p>
                </div>
              )}
            </div>

            {/* Show evaluation or phase */}
            {pendingEvaluation ? (
              <PhaseEvaluationCard
                evaluation={pendingEvaluation}
                phaseLabel={PHASE_LABELS[session.currentPhase as PhaseNumber]}
                onNext={handleNextPhase}
                nextLabel={session.currentPhase === 5 ? "Voir le bilan →" : "Phase suivante →"}
              />
            ) : viewingPhase !== null ? (
              // Review mode: show past phase evaluation read-only
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-muted/30 px-4 py-2 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Consultation — Phase {viewingPhase} : {PHASE_LABELS[viewingPhase]}
                  </p>
                  <button
                    onClick={() => setViewingPhase(null)}
                    className="text-xs text-primary hover:underline"
                  >
                    ← Revenir à la phase actuelle
                  </button>
                </div>
                {session.evaluations[viewingPhase] ? (
                  <PhaseEvaluationCard
                    evaluation={session.evaluations[viewingPhase]!}
                    phaseLabel={PHASE_LABELS[viewingPhase]}
                    onNext={() => setViewingPhase(null)}
                    nextLabel="← Revenir à la phase actuelle"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">Aucune évaluation disponible.</p>
                )}
              </div>
            ) : (
              // Normal phase rendering
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
