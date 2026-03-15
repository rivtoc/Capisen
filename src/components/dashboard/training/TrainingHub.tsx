import SimulationFlow from "./simulation/SimulationFlow";
import ScenarioFlow from "./scenario/ScenarioFlow";
import SimulationHistory from "./simulation/SimulationHistory";

interface Props {
  initialMode: "simulation" | "scenario" | "history";
}

export default function TrainingHub({ initialMode }: Props) {
  if (initialMode === "simulation") return <SimulationFlow />;
  if (initialMode === "scenario") return <ScenarioFlow />;
  if (initialMode === "history") return <SimulationHistory />;
  return null;
}
