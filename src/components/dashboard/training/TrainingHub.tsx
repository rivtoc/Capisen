import SimulationFlow from "./simulation/SimulationFlow";
import ScenarioFlow from "./scenario/ScenarioFlow";

interface Props {
  initialMode: "simulation" | "scenario";
}

export default function TrainingHub({ initialMode }: Props) {
  if (initialMode === "simulation") return <SimulationFlow />;
  if (initialMode === "scenario") return <ScenarioFlow />;
  return null;
}
