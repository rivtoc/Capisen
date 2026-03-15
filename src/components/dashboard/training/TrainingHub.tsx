import { useState } from "react";
import SimulationFlow from "./simulation/SimulationFlow";
import ScenarioFlow from "./scenario/ScenarioFlow";
import SimulationHistory from "./simulation/SimulationHistory";
import type { SimRow } from "./simulation/SimulationHistory";
import { STORAGE_KEY } from "@/hooks/useTrainingSession";
import type { PhaseNumber } from "@/lib/training-types";

interface Props {
  initialMode: "simulation" | "scenario" | "history";
}

export default function TrainingHub({ initialMode }: Props) {
  const [mode, setMode] = useState<"simulation" | "scenario" | "history">(initialMode);

  const handleResume = (sim: SimRow) => {
    const isCompleted = sim.status === "completed";
    const sessionData = {
      simulationId: sim.id,
      brief: sim.brief,
      evaluations: sim.evaluations ?? {},
      responses: sim.responses ?? {},
      currentPhase: isCompleted ? "summary" : (Math.min(sim.current_phase, 5) as PhaseNumber),
      mode: "simulation" as const,
      clientMode: "ai" as const,
      chatHistory: [],
      multiplayerSessionId: null,
      memberClientName: null,
      scenario: null,
      scenarioResponse: null,
      scenarioEvaluation: null,
      startedAt: sim.started_at,
    };
    // Write synchronously to localStorage BEFORE switching mode so that
    // SimulationFlow's useState(loadSession) initializer reads the correct data.
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
    } catch {
      // ignore
    }
    setMode("simulation");
  };

  if (mode === "simulation") return <SimulationFlow />;
  if (mode === "scenario") return <ScenarioFlow />;
  if (mode === "history") return <SimulationHistory onResume={handleResume} />;
  return null;
}
