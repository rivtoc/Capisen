import { FlaskConical, AlertTriangle } from "lucide-react";

interface Props {
  onSelect: (mode: "simulation" | "scenario") => void;
}

export default function ModeSelector({ onSelect }: Props) {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Simulations</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Entraînez-vous au rôle de Suiveur d'Étude avec des mises en situation corrigées par IA
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => onSelect("simulation")}
          className="rounded-xl border border-border bg-card p-5 text-left space-y-3 hover:bg-muted/40 hover:border-primary/30 transition-all duration-150 group"
        >
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <FlaskConical size={17} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Étude blanche</p>
            <p className="text-xs text-muted-foreground mt-1">
              Simulation complète en 5 phases : prise de contact, kickoff, suivi, livraison, clôture.
              Brief généré par IA, corrigé phase par phase.
            </p>
          </div>
          <p className="text-xs text-primary font-medium">5 phases · ~30 min →</p>
        </button>

        <button
          onClick={() => onSelect("scenario")}
          className="rounded-xl border border-border bg-card p-5 text-left space-y-3 hover:bg-muted/40 hover:border-amber-500/30 transition-all duration-150 group"
        >
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
            <AlertTriangle size={17} className="text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Scénario critique</p>
            <p className="text-xs text-muted-foreground mt-1">
              Gérez une crise ciblée (intervenant qui décroche, scope creep, client mécontent…)
              et recevez un feedback immédiat.
            </p>
          </div>
          <p className="text-xs text-amber-500 font-medium">1 crise · ~10 min →</p>
        </button>
      </div>
    </div>
  );
}
