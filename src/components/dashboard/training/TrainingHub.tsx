import { useState } from "react";
import SimulationFlow from "./simulation/SimulationFlow";
import ScenarioFlow from "./scenario/ScenarioFlow";
import SimulationHistory from "./simulation/SimulationHistory";
import type { SimRow } from "./simulation/SimulationHistory";
import { useTrainingSession } from "@/hooks/useTrainingSession";
import type { PhaseNumber } from "@/lib/training-types";

interface Props {
  initialMode: "simulation" | "scenario" | "history";
}

export default function TrainingHub({ initialMode }: Props) {
  const [mode, setMode] = useState<"simulation" | "scenario" | "history">(initialMode);
  const { updateSession } = useTrainingSession();

  const handleResume = (sim: SimRow) => {
    const isCompleted = sim.status === "completed";
    updateSession({
      simulationId: sim.id,
      brief: sim.brief,
      evaluations: sim.evaluations ?? {},
      responses: sim.responses ?? {},
      currentPhase: isCompleted ? "summary" : (Math.min(sim.current_phase, 5) as PhaseNumber),
      mode: "simulation",
      clientMode: "ai",
      chatHistory: [],
      multiplayerSessionId: null,
      memberClientName: null,
      scenario: null,
      scenarioResponse: null,
      scenarioEvaluation: null,
      startedAt: sim.started_at,
    });
    setMode("simulation");
  };

  if (mode === "simulation") return <SimulationFlow />;
  if (mode === "scenario") return <ScenarioFlow />;
  if (mode === "history") return <SimulationHistory onResume={handleResume} />;
  return null;
}
