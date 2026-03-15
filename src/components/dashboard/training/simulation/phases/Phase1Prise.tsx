import { useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { TrainingBrief } from "@/lib/training-types";

interface Props {
  brief: TrainingBrief;
  onSubmit: (response: string) => void;
  loading?: boolean;
}

export default function Phase1Prise({ brief, onSubmit, loading = false }: Props) {
  const [response, setResponse] = useState("");

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Mail size={15} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Phase 1 — Prise de contact</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Vous venez de recevoir ce brief. Rédigez le premier email de prise de contact avec{" "}
          <strong className="text-foreground">{brief.contact}</strong> de{" "}
          <strong className="text-foreground">{brief.client}</strong>. Présentez CAPISEN, montrez
          votre compréhension du projet et proposez un rendez-vous de lancement.
        </p>

        {/* Brief rappel */}
        <div className="rounded-lg bg-muted/40 border border-border p-3 text-xs text-muted-foreground space-y-1">
          <p><span className="font-medium text-foreground">Problématique :</span> {brief.problematique}</p>
          <p><span className="font-medium text-foreground">Budget :</span> {brief.budget_jeh} JEH · {brief.duree_semaines} semaines</p>
          <p><span className="font-medium text-foreground">Livrable :</span> {brief.type_livrable}</p>
        </div>
      </div>

      <Textarea
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        placeholder="Objet : Prise de contact — CAPISEN&#10;&#10;Madame, Monsieur,&#10;..."
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
