import { useState, useEffect, useRef } from "react";
import { FileText, Download, Loader2, AlertCircle, ChevronDown, CheckSquare, Square, Check } from "lucide-react";

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

// ─── Custom dropdown ──────────────────────────────────────────────────────────

interface SelectProps {
  value: string;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  onChange: (v: string) => void;
}

const CustomSelect = ({ value, options, placeholder = "— Sélectionner —", disabled, onChange }: SelectProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-border bg-muted/40 text-sm text-foreground disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-ring/20 transition"
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {value || placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`text-muted-foreground shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full bg-card border border-border rounded-xl shadow-lg overflow-hidden">
          <div className="max-h-56 overflow-y-auto py-1">
            {options.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">Aucune étude disponible.</p>
            ) : (
              options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { onChange(opt); setOpen(false); }}
                  className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-left hover:bg-muted/60 transition-colors"
                >
                  <span className={value === opt ? "text-foreground font-medium" : "text-foreground"}>
                    {opt}
                  </span>
                  {value === opt && <Check size={13} className="text-foreground shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

const EtudesGenerer = () => {
  const [status, setStatus] = useState<Status>("idle");
  const [studies, setStudies] = useState<string[]>([]);
  const [selected, setSelected] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(
    new Set(DOC_TYPES.map((d) => d.id))
  );

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
      setDownloadUrl(URL.createObjectURL(blob));
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
      .catch((e: Error) => { setErrorMsg(e.message); setStatus("error"); });
  };

  const isGenerating = status === "generating";
  const isLoading   = status === "loading-studies";
  const isReady     = status === "ready" || status === "done" || status === "generating";
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
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-2xl px-5 py-4 mb-6">
          <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-600 dark:text-red-400">Erreur</p>
            <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">{errorMsg}</p>
            <p className="text-xs text-red-500/80 mt-1">
              Assure-toi que le serveur Express est démarré (<code className="font-mono">npm run dev:all</code>)
              et que Python avec les dépendances est disponible.
            </p>
          </div>
          <button
            onClick={handleRetry}
            className="text-xs font-medium text-red-600 dark:text-red-400 underline underline-offset-2 shrink-0"
          >
            Réessayer
          </button>
        </div>
      )}

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
            <CustomSelect
              value={selected}
              options={studies}
              placeholder="— Sélectionner une étude —"
              disabled={!isReady || isGenerating}
              onChange={(v) => { setSelected(v); setDownloadUrl(null); setStatus("ready"); }}
            />
          )}
        </div>

        {/* Documents à générer */}
        <div>
          <label className="text-sm font-medium text-foreground block mb-2">
            Documents générés
          </label>
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
                  <span className="text-sm text-foreground flex-1">{doc.label}</span>
                  {doc.always && (
                    <span className="text-[10px] text-muted-foreground/60 font-normal shrink-0">standard</span>
                  )}
                </button>
              );
            })}
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

      {/* Téléchargement */}
      {status === "done" && downloadUrl && (
        <div className="mt-4 bg-green-500/10 border border-green-500/20 rounded-2xl p-5 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-green-700 dark:text-green-400">Documents générés !</p>
            <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">
              ZIP contenant tous les fichiers .pptx pour l'étude{" "}
              <span className="font-medium">{selected}</span>.
            </p>
          </div>
          <a
            href={downloadUrl}
            download="documents.zip"
            className="flex items-center gap-2 px-4 py-2 bg-foreground text-background text-sm font-semibold rounded-xl hover:bg-foreground/90 transition-colors shrink-0"
          >
            <Download size={14} />
            Télécharger
          </a>
        </div>
      )}
    </div>
  );
};

export default EtudesGenerer;
