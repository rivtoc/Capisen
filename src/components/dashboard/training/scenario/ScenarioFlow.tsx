import { useState } from "react";
import { Loader2, AlertTriangle, RotateCcw } from "lucide-react";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import CrisisSelector from "./CrisisSelector";
import ScenarioEvaluationCard from "./ScenarioEvaluationCard";
import type {
  CrisisType,
  TrainingBrief,
  PhaseEvaluation,
} from "@/lib/training-types";

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "http://localhost:3001";

const SECTORS = [
  "Industrie", "Numérique & IT", "Santé", "Finance", "Commerce & Distribution",
  "Agroalimentaire", "Énergie", "Transport & Logistique", "Conseil", "Éducation",
];

const CRISIS_LABELS: Record<CrisisType, string> = {
  intervenant_decroche: "Intervenant décroche",
  scope_creep: "Scope creep",
  client_mecontent: "Client mécontent",
  retard_phase: "Retard de phase",
  conflit_contact: "Conflit avec le contact",
};

type Step = "setup" | "selecting" | "scenario" | "responding" | "done";

export default function ScenarioFlow() {
  const [step, setStep] = useState<Step>("setup");
  const [sector, setSector] = useState("Numérique & IT");
  const [selectedCrisis, setSelectedCrisis] = useState<CrisisType | null>(null);
  const [brief, setBrief] = useState<TrainingBrief | null>(null);
  const [scenarioText, setScenarioText] = useState("");
  const [response, setResponse] = useState("");
  const [evaluation, setEvaluation] = useState<PhaseEvaluation | null>(null);
  const [loadingBrief, setLoadingBrief] = useState(false);
  const [loadingScenario, setLoadingScenario] = useState(false);
  const [loadingEval, setLoadingEval] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateBrief = async () => {
    setLoadingBrief(true);
    setError(null);
    try {
      const res = await fetch(`${SERVER_URL}/api/training/generate-brief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secteur: sector, complexite: "intermediaire" }),
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const data = await res.json();
      setBrief(data);
      setStep("selecting");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de la génération");
    } finally {
      setLoadingBrief(false);
    }
  };

  const generateScenario = async () => {
    if (!brief || !selectedCrisis) return;
    setLoadingScenario(true);
    setError(null);
    try {
      const res = await fetch(`${SERVER_URL}/api/training/generate-scenario`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: selectedCrisis, brief }),
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const data = await res.json();
      setScenarioText(data.description);
      setStep("scenario");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de la génération");
    } finally {
      setLoadingScenario(false);
    }
  };

  const submitResponse = async () => {
    if (!brief || !selectedCrisis) return;
    setLoadingEval(true);
    setError(null);
    try {
      const res = await fetch(`${SERVER_URL}/api/training/evaluate-scenario`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief,
          scenario: { type: selectedCrisis, description: scenarioText },
          response,
        }),
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const data = await res.json();
      setEvaluation(data);
      setStep("done");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'évaluation");
    } finally {
      setLoadingEval(false);
    }
  };

  const restart = () => {
    setStep("setup");
    setSelectedCrisis(null);
    setBrief(null);
    setScenarioText("");
    setResponse("");
    setEvaluation(null);
    setError(null);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Scénario critique</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gérez une situation de crise en tant que Suiveur d'Étude
          </p>
        </div>
        {step !== "setup" && (
          <Button variant="outline" size="sm" onClick={restart} className="gap-1.5">
            <RotateCcw size={13} />
            Recommencer
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-4 flex items-center gap-3">
          <AlertTriangle size={14} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400 flex-1">{error}</p>
          <Button size="sm" variant="outline" onClick={() => setError(null)}>
            Réessayer
          </Button>
        </div>
      )}

      {/* Step 1: Setup */}
      {step === "setup" && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Un brief fictif sera généré, puis vous choisirez un type de crise à gérer.
          </p>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Secteur d'activité</label>
            <CustomSelect
              value={sector}
              options={SECTORS.map((s) => ({ value: s, label: s }))}
              onChange={setSector}
            />
          </div>
          <Button onClick={generateBrief} disabled={loadingBrief} className="gap-2">
            {loadingBrief ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
            {loadingBrief ? "Génération en cours…" : "Générer un brief"}
          </Button>
        </div>
      )}

      {/* Step 2: Select crisis */}
      {step === "selecting" && brief && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Brief généré</p>
            <p className="text-sm font-medium text-foreground">{brief.client} — {brief.secteur}</p>
            <p className="text-xs text-muted-foreground">{brief.problematique}</p>
          </div>
          <CrisisSelector selected={selectedCrisis} onSelect={setSelectedCrisis} />
          <div className="flex justify-end">
            <Button
              onClick={generateScenario}
              disabled={!selectedCrisis || loadingScenario}
              className="gap-2"
            >
              {loadingScenario ? <Loader2 size={14} className="animate-spin" /> : null}
              {loadingScenario ? "Génération…" : "Générer le scénario →"}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Scenario + response */}
      {step === "scenario" && brief && selectedCrisis && (
        <div className="space-y-4">
          {loadingScenario ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-5 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400" />
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                  Crise : {CRISIS_LABELS[selectedCrisis]}
                </p>
              </div>
              <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">{scenarioText}</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">
              Comment gérez-vous cette situation ?
            </label>
            <Textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Décrivez votre plan d'action, les messages que vous enverriez, et les étapes que vous suivriez pour résoudre cette crise..."
              className="min-h-[200px] text-sm"
              disabled={loadingEval}
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={submitResponse}
              disabled={response.trim().length < 30 || loadingEval}
              className="gap-2"
            >
              {loadingEval && <Loader2 size={14} className="animate-spin" />}
              Soumettre ma réponse
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Result */}
      {step === "done" && evaluation && (
        <ScenarioEvaluationCard evaluation={evaluation} onRestart={restart} />
      )}
    </div>
  );
}
