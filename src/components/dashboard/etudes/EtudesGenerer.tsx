import { useState, useEffect } from "react";
import { FileText, Download, Loader2, AlertCircle, ChevronDown, CheckSquare, Square } from "lucide-react";

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "http://localhost:3001";

const DOC_TYPES = [
  { id: "CE",       label: "Cahier des Charges (CE)",                    always: true },
  { id: "RM",       label: "Récapitulatif de Mission (RM)",              always: true },
  { id: "ARM",      label: "Avenant au Récapitulatif de Mission (ARM)",  always: false },
  { id: "ACE",      label: "Attestation de Conformité Externe (ACE)",    always: true },
  { id: "ACE MAIL", label: "ACE — Version Mail",                         always: true },
  { id: "PVRI",     label: "Procès-Verbal de Recette Intermédiaire",     always: true },
  { id: "PVRF",     label: "Procès-Verbal de Recette Finale",            always: true },
];

type Status = "idle" | "loading-studies" | "ready" | "generating" | "done" | "error";

const EtudesGenerer = () => {
  const [status, setStatus] = useState<Status>("idle");
  const [studies, setStudies] = useState<string[]>([]);
  const [selected, setSelected] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(
    new Set(DOC_TYPES.map((d) => d.id))
  );

  // Charge la liste des études dès le montage
  useEffect(() => {
    setStatus("loading-studies");
    fetch(`${SERVER_URL}/api/etudes/studies`)
      .then((r) => {
        if (!r.ok) throw new Error(`Serveur: ${r.status}`);
        return r.json();
      })
      .then((data: string[] | { error: string }) => {
        if (Array.isArray(data)) {
          setStudies(data);
          setStatus("ready");
        } else {
          throw new Error(data.error);
        }
      })
      .catch((e: Error) => {
        setErrorMsg(e.message || "Impossible de contacter le serveur ou l'outil Python.");
        setStatus("error");
      });
  }, []);

  const toggleDoc = (id: string) => {
    setSelectedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleGenerate = async () => {
    if (!selected) return;
    // Clean previous download
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setStatus("generating");
    setErrorMsg("");

    try {
      const res = await fetch(`${SERVER_URL}/api/etudes/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studyName: selected }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `Erreur ${res.status}` }));
        throw new Error(err.error ?? `Erreur ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus("done");
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "Erreur inconnue.");
      setStatus("error");
    }
  };

  const handleRetry = () => {
    setStatus("loading-studies");
    setErrorMsg("");
    setStudies([]);
    setSelected("");
    fetch(`${SERVER_URL}/api/etudes/studies`)
      .then((r) => r.json())
      .then((data: string[] | { error: string }) => {
        if (Array.isArray(data)) { setStudies(data); setStatus("ready"); }
        else throw new Error((data as { error: string }).error);
      })
      .catch((e: Error) => {
        setErrorMsg(e.message);
        setStatus("error");
      });
  };

  const isGenerating = status === "generating";
  const isLoading = status === "loading-studies";
  const isReady = status === "ready" || status === "done" || status === "generating";
  const canGenerate = isReady && !!selected && !isGenerating;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground mb-1">Générer les documents</h2>
        <p className="text-sm text-muted-foreground">
          Sélectionne une étude Notion pour générer automatiquement les 7 documents PowerPoint.
        </p>
      </div>

      {/* Erreur globale */}
      {status === "error" && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-2xl px-5 py-4 mb-6">
          <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">Erreur</p>
            <p className="text-sm text-red-700 mt-0.5">{errorMsg}</p>
            <p className="text-xs text-red-600 mt-1">
              Assure-toi que le serveur Express est démarré (<code className="font-mono">npm run dev:all</code>)
              et que Python avec les dépendances est disponible.
            </p>
          </div>
          <button
            onClick={handleRetry}
            className="text-xs font-medium text-red-700 underline underline-offset-2 shrink-0"
          >
            Réessayer
          </button>
        </div>
      )}

<<<<<<< HEAD
      <div className="bg-card border border-border rounded-2xl p-6 space-y-5">

        {/* Sélecteur d'étude */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Étude Notion</label>
          {isLoading ? (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-muted/40 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" />
              Chargement des études…
            </div>
          ) : (
            <div className="relative">
              <select
                value={selected}
                onChange={(e) => { setSelected(e.target.value); setDownloadUrl(null); setStatus("ready"); }}
                disabled={!isReady || isGenerating}
                className="w-full px-4 py-2.5 pr-9 rounded-xl border border-border bg-background text-sm text-foreground appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-ring"
=======
      {/* Formulaire (front uniquement) */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
        <h3 className="text-sm font-semibold text-foreground">Informations de l'étude</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Nom de l'étude</label>
            <input
              type="text"
              disabled
              placeholder="Ex : Étude MarketPro 2025"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-muted-foreground cursor-not-allowed"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Référence</label>
            <input
              type="text"
              disabled
              placeholder="Ex : CAP-2025-042"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-muted-foreground cursor-not-allowed"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Client</label>
            <input
              type="text"
              disabled
              placeholder="Nom de l'entreprise cliente"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-muted-foreground cursor-not-allowed"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Interlocuteur</label>
            <input
              type="text"
              disabled
              placeholder="Prénom Nom"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-muted-foreground cursor-not-allowed"
            />
          </div>
        </div>

        {/* Sélection des documents */}
        <div>
          <label className="text-sm font-medium text-foreground block mb-3">
            Documents à générer
          </label>
          <div className="space-y-2">
            {DOCUMENT_TYPES.map((doc) => (
              <label
                key={doc.id}
                className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"
>>>>>>> parent of b83cd6f (Amélioration formation plus quiz)
              >
                <option value="">— Sélectionner une étude —</option>
                {studies.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          )}
        </div>

        {/* Documents à générer */}
        <div>
          <label className="text-sm font-medium text-foreground block mb-2">
            Documents générés
          </label>
<<<<<<< HEAD
          <p className="text-xs text-muted-foreground mb-3">
            L'outil génère tous les fichiers applicables selon le nombre d'intervenants de l'étude.
          </p>
          <div className="space-y-1.5">
            {DOC_TYPES.map((doc) => {
              const checked = selectedDocs.has(doc.id);
              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => toggleDoc(doc.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border bg-muted/30 hover:bg-muted/60 transition-colors text-left"
                >
                  {checked
                    ? <CheckSquare size={15} className="text-foreground shrink-0" />
                    : <Square size={15} className="text-muted-foreground shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-foreground">{doc.label}</span>
                  </div>
                  {doc.always && (
                    <span className="text-[10px] text-muted-foreground/60 font-normal shrink-0">standard</span>
                  )}
                </button>
              );
            })}
=======
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center opacity-60 cursor-not-allowed">
            <Upload size={20} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Glissez vos fichiers ici</p>
            <p className="text-xs text-muted-foreground mt-1">PDF, Word, Excel — max 10 Mo</p>
>>>>>>> parent of b83cd6f (Amélioration formation plus quiz)
          </div>
        </div>

        {/* Bouton générer */}
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="w-full flex items-center justify-center gap-2 py-3 bg-foreground text-background text-sm font-semibold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          {isGenerating ? (
            <><Loader2 size={16} className="animate-spin" /> Génération en cours…</>
          ) : (
            <><FileText size={16} /> Générer les documents</>
          )}
        </button>
      </div>

<<<<<<< HEAD
      {/* Téléchargement */}
      {status === "done" && downloadUrl && (
        <div className="mt-4 bg-green-50 border border-green-100 rounded-2xl p-5 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-green-800">Documents générés !</p>
            <p className="text-xs text-green-700 mt-0.5">
              ZIP contenant tous les fichiers .pptx pour l'étude{" "}
              <span className="font-medium">{selected}</span>.
            </p>
          </div>
          <a
            href={downloadUrl}
            download="documents.zip"
            className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white text-sm font-semibold rounded-xl hover:bg-green-800 transition-colors shrink-0"
          >
            <Download size={14} />
            Télécharger
          </a>
=======
      {/* Aperçu des fichiers générés */}
      <div className="mt-6 bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Folder size={16} className="text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Fichiers générés</h3>
>>>>>>> parent of b83cd6f (Amélioration formation plus quiz)
        </div>
      )}
    </div>
  );
};

export default EtudesGenerer;
