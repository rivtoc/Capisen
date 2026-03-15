import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, Trophy, Clock, FlaskConical } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import AnimatedScoreBar from "./AnimatedScoreBar";
import type { PhaseEvaluation, PhaseNumber } from "@/lib/training-types";

const PHASE_LABELS: Record<PhaseNumber, string> = {
  1: "Prise de contact",
  2: "Kickoff",
  3: "Suivi",
  4: "Livraison",
  5: "Clôture",
};

const COMPLEXITY_LABELS: Record<string, string> = {
  debutant: "Débutant",
  intermediaire: "Intermédiaire",
  expert: "Expert",
};

interface SimRow {
  id: string;
  sector: string;
  complexity: string;
  brief_client: string | null;
  evaluations: Partial<Record<PhaseNumber, PhaseEvaluation>>;
  average_score: number | null;
  status: string;
  started_at: string;
  completed_at: string | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function ScoreChip({ score }: { score: number }) {
  const color = score >= 8 ? "text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-500/10 dark:border-green-500/30"
    : score >= 6 ? "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/30"
    : "text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-500/10 dark:border-red-500/30";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-semibold ${color}`}>
      {score.toFixed(1)}/10
    </span>
  );
}

export default function SimulationHistory() {
  const { profile } = useAuth();
  const [simulations, setSimulations] = useState<SimRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    supabase
      .from("training_simulations")
      .select("id, sector, complexity, brief_client, evaluations, average_score, status, started_at, completed_at")
      .eq("member_id", profile.id)
      .order("updated_at", { ascending: false })
      .then(({ data }) => {
        setSimulations((data ?? []) as SimRow[]);
        setLoading(false);
      });
  }, [profile]);

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 h-16 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Historique</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Toutes vos études blanches (en cours et terminées)
        </p>
      </div>

      {simulations.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center space-y-2">
          <FlaskConical size={28} className="mx-auto text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Aucune simulation terminée pour l'instant.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {simulations.map((sim) => {
            const isOpen = expanded === sim.id;
            const phases: PhaseNumber[] = [1, 2, 3, 4, 5];
            return (
              <motion.div
                key={sim.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-border bg-card overflow-hidden"
              >
                {/* Header row */}
                <button
                  onClick={() => setExpanded(isOpen ? null : sim.id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Trophy size={14} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {sim.brief_client ?? sim.sector}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        <span>{sim.sector}</span>
                        <span>·</span>
                        <span>{COMPLEXITY_LABELS[sim.complexity] ?? sim.complexity}</span>
                        <span>·</span>
                        <Clock size={11} />
                        <span>{sim.completed_at ? formatDate(sim.completed_at) : formatDate(sim.started_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    {sim.status === "in_progress" ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-semibold text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-500/10 dark:border-blue-500/30">
                        En cours
                      </span>
                    ) : sim.average_score !== null ? (
                      <ScoreChip score={sim.average_score} />
                    ) : null}
                    {isOpen ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                  </div>
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="border-t border-border px-5 py-4 space-y-4">
                    {/* Score bar */}
                    {sim.average_score !== null && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Note globale</p>
                        <AnimatedScoreBar score={Math.round(sim.average_score)} />
                      </div>
                    )}

                    {/* Per-phase detail */}
                    <div className="space-y-3">
                      {phases.map((p) => {
                        const ev = sim.evaluations[p];
                        if (!ev) return null;
                        return (
                          <div key={p} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium text-foreground">
                                Phase {p} — {PHASE_LABELS[p]}
                              </span>
                              <span className="text-muted-foreground">{ev.note}/10</span>
                            </div>
                            <AnimatedScoreBar score={ev.note} />
                            <p className="text-xs text-muted-foreground">{ev.verdict}</p>
                            <div className="grid grid-cols-2 gap-2 mt-1">
                              <div className="rounded-lg bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 px-3 py-2">
                                <p className="text-[10px] font-semibold text-green-700 dark:text-green-400 mb-0.5">Point fort</p>
                                <p className="text-[11px] text-green-700/80 dark:text-green-400/80">{ev.point_fort}</p>
                              </div>
                              <div className="rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-3 py-2">
                                <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 mb-0.5">À améliorer</p>
                                <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80">{ev.a_ameliorer}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
