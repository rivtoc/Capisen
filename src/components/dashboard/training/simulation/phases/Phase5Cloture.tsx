import { useState } from "react";
import { Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { TrainingBrief } from "@/lib/training-types";

interface Props {
  brief: TrainingBrief;
  onSubmit: (response: string) => void;
  loading?: boolean;
}

export default function Phase5Cloture({ brief, onSubmit, loading = false }: Props) {
  const [response, setResponse] = useState("");

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle size={15} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Phase 5 — Clôture de l'étude</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          La mission touche à sa fin. Rédigez l'email de clôture à{" "}
          <strong className="text-foreground">{brief.contact}</strong> : bilan de l'étude,
          vérification de la satisfaction client, aspects administratifs (facturation, PVRF),
          et ouverture sur une future collaboration.
        </p>

        <div className="rounded-lg bg-muted/40 border border-border p-3 text-xs text-muted-foreground space-y-1">
          <p><span className="font-medium text-foreground">Budget :</span> {brief.budget_jeh} JEH à facturer</p>
          <p><span className="font-medium text-foreground">Documents à mentionner :</span> PVRF (Procès-Verbal de Recette Finale), ACE</p>
          <p><span className="font-medium text-foreground">Objectif :</span> Clôture administrative + fidélisation client</p>
        </div>
      </div>

      <Textarea
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        placeholder="Objet : Clôture de la mission — [nom étude]&#10;&#10;Madame, Monsieur,&#10;&#10;C'est avec satisfaction que nous vous informons de la bonne finalisation de notre mission..."
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
          Terminer la simulation
        </Button>
      </div>
    </div>
  );
}
