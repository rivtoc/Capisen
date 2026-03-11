import { useState, useEffect, useRef } from "react";
import { FileText, Download, Upload, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

const BUCKET = "doc-templates";

const DOC_TYPES = [
  {
    code: "CE",
    file: "CE.pptx",
    name: "Cahier des Charges",
    color: "badge-blue",
    description: "Document contractuel définissant les objectifs, le périmètre et les livrables de la mission.",
    fields: ["Nom de l'étude", "Client", "Interlocuteur", "Phases de mission", "Budget HT", "Dates de début/fin"],
  },
  {
    code: "RM",
    file: "RM.pptx",
    name: "Récapitulatif de Mission",
    color: "badge-violet",
    description: "Synthèse de la mission par intervenant : rôle, dates, rémunération et phases assignées.",
    fields: ["Intervenant (Prénom NOM)", "Email & téléphone", "Phases assignées", "Montant rétribution", "Dates"],
  },
  {
    code: "ARM",
    file: "ARM.pptx",
    name: "Avenant au Récapitulatif de Mission",
    color: "badge-orange",
    description: "Avenant au RM initial en cas de modification des conditions (phases, durée, rémunération).",
    fields: ["Référence RM lié", "Intervenant", "Modifications apportées", "Nouveau montant"],
  },
  {
    code: "ACE",
    file: "ACE.pptx",
    name: "Attestation de Conformité Externe",
    color: "badge-green",
    description: "Attestation certifiant la bonne réalisation de la mission, signée par le client.",
    fields: ["Organisme client", "Président(e)", "Référence étude", "Date de fin", "Montant total TTC"],
  },
  {
    code: "ACE MAIL",
    file: "ACE MAIL.pptx",
    name: "ACE — Version Mail",
    color: "badge-teal",
    description: "Version simplifiée de l'ACE formatée pour envoi par email au client.",
    fields: ["Mêmes champs que ACE", "Email client", "Formule de politesse genrée"],
  },
  {
    code: "PVRI",
    file: "PVRI.pptx",
    name: "Procès-Verbal de Recette Intermédiaire",
    color: "badge-amber",
    description: "Validation intermédiaire d'une phase ou d'un livrable partiel de l'étude.",
    fields: ["Phase concernée", "Date du point de contrôle", "Livrable validé", "Signataires"],
  },
  {
    code: "PVRF",
    file: "PVRF.pptx",
    name: "Procès-Verbal de Recette Finale",
    color: "badge-red",
    description: "Validation finale de l'ensemble de la mission, actant la clôture de l'étude.",
    fields: ["Toutes les phases", "Budget total TTC", "Date de fin de mission", "Signataires finaux"],
  },
];

type FileStatus = Record<string, "idle" | "downloading" | "uploading" | "ok" | "error">;

const EtudesDocsTypes = () => {
  const [fileStatus, setFileStatus] = useState<FileStatus>({});
  const [uploadMsg, setUploadMsg] = useState<Record<string, string>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    const init: FileStatus = {};
    DOC_TYPES.forEach((d) => (init[d.file] = "idle"));
    setFileStatus(init);
  }, []);

  const setStatus = (file: string, status: FileStatus[string]) =>
    setFileStatus((prev) => ({ ...prev, [file]: status }));

  const handleDownload = async (file: string) => {
    setStatus(file, "downloading");
    const { data, error } = await supabase.storage.from(BUCKET).download(file);
    if (error || !data) {
      setStatus(file, "error");
      return;
    }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = file;
    a.click();
    URL.revokeObjectURL(url);
    setStatus(file, "idle");
  };

  const handleUpload = async (file: string, inputFile: File) => {
    setStatus(file, "uploading");
    setUploadMsg((prev) => ({ ...prev, [file]: "" }));
    const { error } = await supabase.storage.from(BUCKET).upload(file, inputFile, { upsert: true });
    if (error) {
      setStatus(file, "error");
      setUploadMsg((prev) => ({ ...prev, [file]: error.message }));
    } else {
      setStatus(file, "ok");
      setUploadMsg((prev) => ({ ...prev, [file]: "Remplacé avec succès" }));
      setTimeout(() => setStatus(file, "idle"), 2500);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-foreground mb-1">Types de documents</h2>
        <p className="text-sm text-muted-foreground">
          Les 7 modèles PowerPoint stockés dans Supabase, utilisés pour la génération automatique.
          Tu peux télécharger ou remplacer chaque modèle.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {DOC_TYPES.map((doc) => {
          const status = fileStatus[doc.file] ?? "idle";
          return (
            <div key={doc.code} className="bg-card border border-border rounded-2xl p-5 flex gap-5">
              {/* Badge */}
              <div className="shrink-0 flex flex-col items-start pt-0.5">
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

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {doc.fields.map((field) => (
                    <span key={field} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full border border-border">
                      {field}
                    </span>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Télécharger */}
                  <button
                    onClick={() => handleDownload(doc.file)}
                    disabled={status === "downloading" || status === "uploading"}
                    className="btn-sm-outline"
                  >
                    {status === "downloading"
                      ? <Loader2 size={12} className="animate-spin" />
                      : <Download size={12} />}
                    Télécharger
                  </button>

                  {/* Remplacer */}
                  <button
                    onClick={() => fileInputRefs.current[doc.file]?.click()}
                    disabled={status === "downloading" || status === "uploading"}
                    className="btn-sm-outline"
                  >
                    {status === "uploading"
                      ? <Loader2 size={12} className="animate-spin" />
                      : <Upload size={12} />}
                    Remplacer
                  </button>
                  <input
                    ref={(el) => { fileInputRefs.current[doc.file] = el; }}
                    type="file"
                    accept=".pptx"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUpload(doc.file, f);
                      e.target.value = "";
                    }}
                  />

                  {/* Feedback */}
                  {status === "ok" && (
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle size={12} /> {uploadMsg[doc.file]}
                    </span>
                  )}
                  {status === "error" && (
                    <span className="flex items-center gap-1 text-xs text-red-600">
                      <AlertCircle size={12} /> {uploadMsg[doc.file] || "Erreur"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground mt-6 text-center">
        Les placeholders suivent la syntaxe <code className="font-mono">[Nom du champ]</code>.
        Les placeholders conditionnels utilisent <code className="font-mono">[&#123;type client == Privé&#125;texte]</code>.
      </p>
    </div>
  );
};

export default EtudesDocsTypes;
