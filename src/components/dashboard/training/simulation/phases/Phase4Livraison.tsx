import { useState } from "react";
import { Loader2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { TrainingBrief } from "@/lib/training-types";

interface Props {
  brief: TrainingBrief;
  onSubmit: (response: string) => void;
  loading?: boolean;
}

export default function Phase4Livraison({ brief, onSubmit, loading = false }: Props) {
  const [response, setResponse] = useState("");

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Package size={15} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Phase 4 — Livraison du livrable</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Le livrable est prêt. Rédigez l'email de livraison à{" "}
          <strong className="text-foreground">{brief.contact}</strong> pour présenter et transmettre
          le livrable, mettre en valeur le travail réalisé, et demander une validation formelle.
        </p>

        <div className="rounded-lg bg-muted/40 border border-border p-3 text-xs text-muted-foreground space-y-1">
          <p><span className="font-medium text-foreground">Livrable :</span> {brief.type_livrable === "informatique" ? "Document/application numérique" : "Rapport papier"}</p>
          <p><span className="font-medium text-foreground">Cahier des charges :</span> {brief.cahier_des_charges.join(" · ")}</p>
          <p><span className="font-medium text-foreground">Durée totale :</span> {brief.duree_semaines} semaines</p>
        </div>
      </div>

      <Textarea
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        placeholder="Objet : Livraison de la mission — [nom étude]&#10;&#10;Madame, Monsieur,&#10;&#10;Nous avons le plaisir de vous remettre le livrable de la mission..."
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
