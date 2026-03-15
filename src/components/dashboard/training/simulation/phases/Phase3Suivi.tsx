import { useState } from "react";
import { Loader2, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { TrainingBrief } from "@/lib/training-types";

interface Props {
  brief: TrainingBrief;
  onSubmit: (response: string) => void;
  loading?: boolean;
}

export default function Phase3Suivi({ brief, onSubmit, loading = false }: Props) {
  const [response, setResponse] = useState("");

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Activity size={15} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Phase 3 — Suivi de mission</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          L'étude est en cours depuis plusieurs semaines. Rédigez un email de suivi à mi-parcours
          à <strong className="text-foreground">{brief.contact}</strong> pour informer de
          l'avancement, signaler les éventuels blocages et maintenir la relation client.
        </p>

        <div className="rounded-lg bg-muted/40 border border-border p-3 text-xs text-muted-foreground space-y-1">
          <p><span className="font-medium text-foreground">Étude :</span> {brief.problematique}</p>
          <p><span className="font-medium text-foreground">Avancement théorique :</span> ~50% de la mission ({Math.ceil(brief.duree_semaines / 2)} semaines écoulées)</p>
          {brief.pieges.length > 0 && (
            <p><span className="font-medium text-foreground">Point d'attention :</span> {brief.pieges[0]}</p>
          )}
        </div>
      </div>

      <Textarea
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        placeholder="Objet : Point d'avancement — Mission [nom étude]&#10;&#10;Madame, Monsieur,&#10;&#10;Je me permets de vous contacter pour vous faire un point sur l'avancement de notre mission..."
        className="min-h-[220px] text-sm"
        disabled={loading}
      />

      <div className="flex justify-end">
        <Button
          onClick={() => onSubmit(response)}
          disabled={response.trim().length < 30 || loading}
          className="gap-2"
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          Soumettre pour évaluation
        </Button>
      </div>
    </div>
  );
}
