import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, RotateCcw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import AnimatedScoreBar from "./AnimatedScoreBar";
import type { PhaseEvaluation, TrainingBrief, PhaseNumber } from "@/lib/training-types";

const PHASE_LABELS: Record<PhaseNumber, string> = {
  1: "Prise de contact",
  2: "Kickoff",
  3: "Suivi",
  4: "Livraison",
  5: "Clôture",
};

interface Props {
  evaluations: Partial<Record<PhaseNumber, PhaseEvaluation>>;
  brief: TrainingBrief;
  onRestart: () => void;
}

export default function SummaryCard({ evaluations, brief, onRestart }: Props) {
  const [copied, setCopied] = useState(false);

  const phases: PhaseNumber[] = [1, 2, 3, 4, 5];
  const notes = phases.map((p) => evaluations[p]?.note ?? 0);
  const avg = notes.reduce((s, n) => s + n, 0) / phases.length;

  const handleCopy = () => {
    const lines = [
      `Bilan — Étude blanche CAPISEN`,
      `Client : ${brief.client} (${brief.secteur})`,
      `Complexité : ${brief.complexite}`,
      ``,
      ...phases.map((p) => `Phase ${p} — ${PHASE_LABELS[p]} : ${evaluations[p]?.note ?? "—"}/10`),
      ``,
      `Note globale : ${avg.toFixed(1)}/10`,
    ];
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const globalVerdict = () => {
    if (avg >= 8) return "Excellent travail ! Vous maîtrisez les fondamentaux du rôle de Suiveur d'Étude.";
    if (avg >= 6) return "Bon travail. Quelques axes d'amélioration à travailler avant les vraies études.";
    if (avg >= 4) return "Résultat moyen. Revoyez les bases et recommencez l'exercice.";
    return "Il faut progresser. Lisez les retours détaillés et pratiquez davantage.";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-5"
    >
      {/* Header */}
      <div className="rounded-xl border border-border bg-card p-6 text-center space-y-3">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Trophy size={22} className="text-primary" />
          </div>
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Simulation terminée !</h2>
          <p className="text-sm text-muted-foreground mt-1">{globalVerdict()}</p>
        </div>
        <div className="max-w-xs mx-auto">
          <AnimatedScoreBar score={Math.round(avg)} />
        </div>
        <p className="text-xs text-muted-foreground">
          Moyenne sur 5 phases — {brief.client} ({brief.secteur})
        </p>
      </div>

      {/* Détail phases */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Résultats par phase
        </p>
        <div className="space-y-3">
          {phases.map((p) => {
            const ev = evaluations[p];
            return (
              <div key={p} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground font-medium">
                    Phase {p} — {PHASE_LABELS[p]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {ev?.note ?? "—"}/10
                  </span>
                </div>
                {ev && <AnimatedScoreBar score={ev.note} />}
                {ev && (
                  <p className="text-xs text-muted-foreground">{ev.verdict}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 justify-end">
        <Button variant="outline" onClick={handleCopy} className="gap-2">
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copié !" : "Copier le bilan"}
        </Button>
        <Button onClick={onRestart} className="gap-2">
          <RotateCcw size={14} />
          Nouvelle simulation
        </Button>
      </div>
    </motion.div>
  );
}
