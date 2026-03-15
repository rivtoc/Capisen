import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, ThumbsUp, AlertTriangle, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import AnimatedScoreBar from "./AnimatedScoreBar";
import type { PhaseEvaluation } from "@/lib/training-types";

interface Props {
  evaluation: PhaseEvaluation;
  phaseLabel: string;
  onNext: () => void;
  nextLabel?: string;
}

export default function PhaseEvaluationCard({
  evaluation,
  phaseLabel,
  onNext,
  nextLabel = "Phase suivante →",
}: Props) {
  const [showIdeal, setShowIdeal] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
              Résultat — {phaseLabel}
            </p>
            <p className="text-sm font-medium text-foreground">{evaluation.verdict}</p>
          </div>
        </div>
        <AnimatedScoreBar score={evaluation.note} />
      </div>

      {/* Critères */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Détail des critères
        </p>
        <div className="space-y-2">
          {evaluation.criteres.map((c, i) => (
            <div key={i} className="flex items-start gap-3">
              <span
                className={`text-xs font-bold shrink-0 mt-0.5 ${
                  c.points >= 2 ? "text-green-500" : c.points === 1 ? "text-amber-500" : "text-red-500"
                }`}
              >
                {c.points}pt
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">{c.nom}</p>
                <p className="text-xs text-muted-foreground">{c.feedback}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Point fort / à améliorer */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-green-200 dark:border-green-500/20 bg-green-50 dark:bg-green-500/10 p-4 flex gap-3">
          <ThumbsUp size={15} className="text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-0.5">Point fort</p>
            <p className="text-xs text-green-700/80 dark:text-green-400/80">{evaluation.point_fort}</p>
          </div>
        </div>
        <div className="rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 p-4 flex gap-3">
          <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-0.5">À améliorer</p>
            <p className="text-xs text-amber-700/80 dark:text-amber-400/80">{evaluation.a_ameliorer}</p>
          </div>
        </div>
      </div>

      {/* Réponse idéale (toggle) */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <button
          onClick={() => setShowIdeal((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3 text-sm hover:bg-muted/40 transition-colors"
        >
          <span className="flex items-center gap-2 font-medium text-foreground">
            <Lightbulb size={14} className="text-primary" />
            Voir la réponse idéale
          </span>
          {showIdeal ? (
            <ChevronUp size={14} className="text-muted-foreground" />
          ) : (
            <ChevronDown size={14} className="text-muted-foreground" />
          )}
        </button>
        {showIdeal && (
          <div className="px-5 pb-4">
            <p className="text-sm text-muted-foreground leading-relaxed border-t border-border pt-3">
              {evaluation.reponse_ideale}
            </p>
          </div>
        )}
      </div>

      {/* Next button */}
      <div className="flex justify-end">
        <Button onClick={onNext}>{nextLabel}</Button>
      </div>
    </motion.div>
  );
}
