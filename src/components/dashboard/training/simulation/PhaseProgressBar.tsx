import { Check } from "lucide-react";
import type { PhaseNumber } from "@/lib/training-types";

const PHASES: { number: PhaseNumber; label: string; short: string }[] = [
  { number: 1, label: "Prise de contact", short: "Contact" },
  { number: 2, label: "Kickoff", short: "Kickoff" },
  { number: 3, label: "Suivi", short: "Suivi" },
  { number: 4, label: "Livraison", short: "Livraison" },
  { number: 5, label: "Clôture", short: "Clôture" },
];

interface Props {
  currentPhase: PhaseNumber | "summary";
  completedPhases: PhaseNumber[];
}

export default function PhaseProgressBar({ currentPhase, completedPhases }: Props) {
  return (
    <div className="flex items-center gap-0 w-full">
      {PHASES.map((phase, idx) => {
        const isDone = completedPhases.includes(phase.number);
        const isActive =
          currentPhase !== "summary" && currentPhase === phase.number;
        const isPast =
          isDone || (currentPhase !== "summary" && phase.number < currentPhase);

        return (
          <div key={phase.number} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center flex-1 min-w-0">
              <div
                className={`
                  w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors
                  ${isDone ? "bg-green-500 text-white" : ""}
                  ${isActive && !isDone ? "bg-primary text-primary-foreground ring-2 ring-primary/30" : ""}
                  ${!isActive && !isDone ? "bg-muted text-muted-foreground" : ""}
                `}
              >
                {isDone ? <Check size={13} /> : phase.number}
              </div>
              <span
                className={`
                  hidden sm:block text-[10px] mt-1 text-center truncate max-w-[56px]
                  ${isActive ? "text-foreground font-medium" : "text-muted-foreground"}
                `}
              >
                {phase.short}
              </span>
            </div>
            {idx < PHASES.length - 1 && (
              <div
                className={`h-px flex-1 mx-1 transition-colors ${
                  isPast ? "bg-primary/40" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
