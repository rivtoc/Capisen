import { FileText, ExternalLink } from "lucide-react";

const DOC_TYPES = [
  {
    code: "CE",
    name: "Cahier des Charges",
    color: "bg-blue-50 border-blue-100 text-blue-700",
    dot: "bg-blue-500",
    description: "Document contractuel définissant les objectifs, le périmètre et les livrables de la mission.",
    fields: ["Nom de l'étude", "Client", "Interlocuteur", "Phases de mission", "Budget HT", "Dates de début/fin"],
  },
  {
    code: "RM",
    name: "Récapitulatif de Mission",
    color: "bg-violet-50 border-violet-100 text-violet-700",
    dot: "bg-violet-500",
    description: "Synthèse de la mission par intervenant : rôle, dates, rémunération et phases assignées.",
    fields: ["Intervenant (Prénom NOM)", "Email & téléphone", "Phases assignées", "Montant rétribution", "Dates"],
  },
  {
    code: "ARM",
    name: "Avenant au Récapitulatif de Mission",
    color: "bg-orange-50 border-orange-100 text-orange-700",
    dot: "bg-orange-500",
    description: "Avenant au RM initial en cas de modification des conditions (phases, durée, rémunération).",
    fields: ["Référence RM lié", "Intervenant", "Modifications apportées", "Nouveau montant"],
  },
  {
    code: "ACE",
    name: "Attestation de Conformité Externe",
    color: "bg-green-50 border-green-100 text-green-700",
    dot: "bg-green-500",
    description: "Attestation certifiant la bonne réalisation de la mission, signée par le client.",
    fields: ["Organisme client", "Président(e)", "Référence étude", "Date de fin", "Montant total TTC"],
  },
  {
    code: "ACE MAIL",
    name: "ACE — Version Mail",
    color: "bg-teal-50 border-teal-100 text-teal-700",
    dot: "bg-teal-500",
    description: "Version simplifiée de l'ACE formatée pour envoi par email au client.",
    fields: ["Mêmes champs que ACE", "Email client", "Formule de politesse genrée"],
  },
  {
    code: "PVRI",
    name: "Procès-Verbal de Recette Intermédiaire",
    color: "bg-amber-50 border-amber-100 text-amber-700",
    dot: "bg-amber-500",
    description: "Validation intermédiaire d'une phase ou d'un livrable partiel de l'étude.",
    fields: ["Phase concernée", "Date du point de contrôle", "Livrable validé", "Signataires"],
  },
  {
    code: "PVRF",
    name: "Procès-Verbal de Recette Finale",
    color: "bg-red-50 border-red-100 text-red-700",
    dot: "bg-red-500",
    description: "Validation finale de l'ensemble de la mission, actant la clôture de l'étude.",
    fields: ["Toutes les phases", "Budget total TTC", "Date de fin de mission", "Signataires finaux"],
  },
];

const EtudesDocsTypes = () => {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground mb-1">Types de documents</h2>
        <p className="text-sm text-muted-foreground">
          Les 7 modèles PowerPoint utilisés par l'outil de génération automatique.
          Chaque modèle est rempli à partir des données Notion de l'étude sélectionnée.
        </p>
      </div>

      {/* Source info */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 border border-border rounded-xl px-4 py-3 mb-8">
        <ExternalLink size={13} />
        <span>
          Modèles source dans{" "}
          <code className="font-mono text-foreground">
            suivi etude/aides_python/v1/doc/
          </code>
          — ACE.pptx, ACE MAIL.pptx, ARM.pptx, CE.pptx, PVRI.pptx, PVRF.pptx, RM.pptx
        </span>
      </div>

      {/* Doc type cards */}
      <div className="grid grid-cols-1 gap-4">
        {DOC_TYPES.map((doc) => (
          <div
            key={doc.code}
            className="bg-card border border-border rounded-2xl p-5 flex gap-5"
          >
            {/* Code badge */}
            <div className="shrink-0 flex flex-col items-center justify-start pt-0.5">
              <div className={`px-3 py-1.5 rounded-lg border text-xs font-bold font-mono ${doc.color}`}>
                {doc.code}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <FileText size={14} className="text-muted-foreground shrink-0" />
                <h3 className="text-sm font-semibold text-foreground">{doc.name}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{doc.description}</p>

              {/* Fields */}
              <div>
                <p className="text-xs font-medium text-foreground mb-1.5">Champs remplis automatiquement :</p>
                <div className="flex flex-wrap gap-1.5">
                  {doc.fields.map((field) => (
                    <span
                      key={field}
                      className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full border border-border"
                    >
                      {field}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Note */}
      <p className="text-xs text-muted-foreground mt-6 text-center">
        Les placeholders dans les fichiers .pptx suivent la syntaxe{" "}
        <code className="font-mono">[Nom du champ]</code>.
        Les placeholders conditionnels utilisent{" "}
        <code className="font-mono">[&#123;type client == Privé&#125;texte]</code>.
      </p>
    </div>
  );
};

export default EtudesDocsTypes;
