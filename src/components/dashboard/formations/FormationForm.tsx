import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Trash2, ChevronUp, ChevronDown, Loader2, X, FileText, Upload } from "lucide-react";
import type { PoleType } from "@/lib/db-types";

interface StepDocument {
  id: string;
  file_name: string;
  storage_path: string;
}

interface StepFormData {
  id?: string;
  title: string;
  description: string;
  video_url: string;
  newFiles: File[];
  existingDocuments: StepDocument[];
}

interface Formation {
  id: string;
  title: string;
  description: string | null;
  pole: PoleType;
}

interface Props {
  pole: PoleType;
  formation: Formation | null;
  onBack: () => void;
  onSaved: () => void;
}

const emptyStep = (): StepFormData => ({
  title: "",
  description: "",
  video_url: "",
  newFiles: [],
  existingDocuments: [],
});

const FormationForm = ({ pole, formation, onBack, onSaved }: Props) => {
  const { user } = useAuth();
  const [title, setTitle] = useState(formation?.title ?? "");
  const [description, setDescription] = useState(formation?.description ?? "");
  const [steps, setSteps] = useState<StepFormData[]>([emptyStep()]);
  const [loadingSteps, setLoadingSteps] = useState(!!formation);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!formation) return;
    const load = async () => {
      const { data } = await supabase
        .from("steps")
        .select("*, step_documents(*)")
        .eq("formation_id", formation.id)
        .order("order_index");
      if (data && data.length > 0) {
        setSteps(
          data.map((s: any) => ({
            id: s.id,
            title: s.title,
            description: s.description ?? "",
            video_url: s.video_url ?? "",
            newFiles: [],
            existingDocuments: s.step_documents ?? [],
          }))
        );
      }
      setLoadingSteps(false);
    };
    load();
  }, [formation]);

  const updateStep = (index: number, patch: Partial<StepFormData>) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const addStep = () => setSteps((prev) => [...prev, emptyStep()]);

  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const moveStep = (index: number, dir: -1 | 1) => {
    setSteps((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const addFiles = (index: number, files: FileList | null) => {
    if (!files) return;
    updateStep(index, { newFiles: [...steps[index].newFiles, ...Array.from(files)] });
  };

  const removeNewFile = (stepIndex: number, fileIndex: number) => {
    updateStep(stepIndex, {
      newFiles: steps[stepIndex].newFiles.filter((_, i) => i !== fileIndex),
    });
  };

  const removeExistingDoc = (stepIndex: number, docId: string) => {
    updateStep(stepIndex, {
      existingDocuments: steps[stepIndex].existingDocuments.filter((d) => d.id !== docId),
    });
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Le titre de la formation est requis.");
      return;
    }
    if (steps.some((s) => !s.title.trim())) {
      setError("Chaque étape doit avoir un titre.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      let formationId = formation?.id;

      if (!formationId) {
        const { data, error: e } = await supabase
          .from("formations")
          .insert({ title: title.trim(), description: description || null, pole, created_by: user?.id })
          .select("id")
          .single();
        if (e) throw e;
        formationId = data.id;
      } else {
        const { error: e } = await supabase
          .from("formations")
          .update({ title: title.trim(), description: description || null })
          .eq("id", formationId);
        if (e) throw e;

        // Supprimer les étapes retirées
        const { data: dbSteps } = await supabase
          .from("steps")
          .select("id")
          .eq("formation_id", formationId);
        const keptIds = new Set(steps.filter((s) => s.id).map((s) => s.id));
        const toDelete = (dbSteps ?? []).filter((s: any) => !keptIds.has(s.id));
        for (const s of toDelete) {
          await supabase.from("step_documents").delete().eq("step_id", s.id);
          await supabase.from("steps").delete().eq("id", s.id);
        }
      }

      // Upsert des étapes
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        let stepId = step.id;

        if (stepId) {
          await supabase
            .from("steps")
            .update({
              title: step.title.trim(),
              description: step.description || null,
              video_url: step.video_url || null,
              order_index: i,
            })
            .eq("id", stepId);

          // Supprimer les docs retirés
          const { data: dbDocs } = await supabase
            .from("step_documents")
            .select("id")
            .eq("step_id", stepId);
          const keptDocIds = new Set(step.existingDocuments.map((d) => d.id));
          const docsToDelete = (dbDocs ?? []).filter((d: any) => !keptDocIds.has(d.id));
          if (docsToDelete.length > 0) {
            await supabase
              .from("step_documents")
              .delete()
              .in("id", docsToDelete.map((d: any) => d.id));
          }
        } else {
          const { data: newStep, error: e } = await supabase
            .from("steps")
            .insert({
              formation_id: formationId,
              title: step.title.trim(),
              description: step.description || null,
              video_url: step.video_url || null,
              order_index: i,
            })
            .select("id")
            .single();
          if (e) throw e;
          stepId = newStep.id;
        }

        // Upload nouveaux fichiers
        for (const file of step.newFiles) {
          const safeName = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");
          const path = `steps/${stepId}/${Date.now()}_${safeName}`;
          const { error: uploadErr } = await supabase.storage.from("formations").upload(path, file);
          if (uploadErr) throw uploadErr;
          await supabase.from("step_documents").insert({
            step_id: stepId,
            file_name: file.name,
            storage_path: path,
            uploaded_by: user?.id,
          });
        }
      }

      onSaved();
    } catch (err: any) {
      setError(err.message ?? "Une erreur est survenue.");
      setSaving(false);
    }
  };

  if (loadingSteps) {
    return <div className="p-8 text-center text-muted-foreground">Chargement…</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Retour
        </button>
        <h2 className="text-xl font-bold text-foreground">
          {formation ? "Modifier la formation" : "Nouvelle formation"}
        </h2>
      </div>

      {/* Infos générales */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Informations générales</h3>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Titre *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex : Initiation à la prospection commerciale"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">
            Description{" "}
            <span className="text-muted-foreground font-normal">(optionnel)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Décrivez l'objectif de cette formation…"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition"
          />
        </div>
      </div>

      {/* Étapes */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Étapes{" "}
            <span className="text-muted-foreground font-normal">({steps.length})</span>
          </h3>
          <button
            onClick={addStep}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Plus size={12} />
            Ajouter une étape
          </button>
        </div>

        {steps.map((step, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
            {/* En-tête étape */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Étape {index + 1}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => moveStep(index, -1)}
                  disabled={index === 0}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors"
                  title="Monter"
                >
                  <ChevronUp size={14} className="text-muted-foreground" />
                </button>
                <button
                  onClick={() => moveStep(index, 1)}
                  disabled={index === steps.length - 1}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors"
                  title="Descendre"
                >
                  <ChevronDown size={14} className="text-muted-foreground" />
                </button>
                <button
                  onClick={() => removeStep(index)}
                  disabled={steps.length === 1}
                  className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 disabled:opacity-30 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Titre */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Titre *</label>
              <input
                type="text"
                value={step.title}
                onChange={(e) => updateStep(index, { title: e.target.value })}
                placeholder="Ex : Comprendre les bases de la prospection"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition"
              />
            </div>

            {/* Contenu */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">
                Contenu{" "}
                <span className="text-muted-foreground font-normal">(optionnel)</span>
              </label>
              <textarea
                value={step.description}
                onChange={(e) => updateStep(index, { description: e.target.value })}
                rows={4}
                placeholder="Instructions, explications, consignes à reproduire…"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition"
              />
            </div>

            {/* Lien vidéo */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">
                Lien vidéo{" "}
                <span className="text-muted-foreground font-normal">(optionnel)</span>
              </label>
              <input
                type="url"
                value={step.video_url}
                onChange={(e) => updateStep(index, { video_url: e.target.value })}
                placeholder="https://youtu.be/… ou https://vimeo.com/…"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition"
              />
            </div>

            {/* Documents */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">
                Documents{" "}
                <span className="text-muted-foreground font-normal">
                  (à télécharger par le formé, optionnel)
                </span>
              </label>

              {/* Docs existants */}
              {step.existingDocuments.length > 0 && (
                <div className="flex flex-col gap-1">
                  {step.existingDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    >
                      <FileText size={14} className="text-muted-foreground shrink-0" />
                      <span className="flex-1 truncate text-foreground">{doc.file_name}</span>
                      <button
                        onClick={() => removeExistingDoc(index, doc.id)}
                        className="text-muted-foreground hover:text-red-600 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Nouveaux fichiers sélectionnés */}
              {step.newFiles.length > 0 && (
                <div className="flex flex-col gap-1">
                  {step.newFiles.map((f, fi) => (
                    <div
                      key={fi}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-sm"
                    >
                      <FileText size={14} className="text-blue-500 shrink-0" />
                      <span className="flex-1 truncate text-foreground">{f.name}</span>
                      <button
                        onClick={() => removeNewFile(index, fi)}
                        className="text-muted-foreground hover:text-red-600 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <label className="flex items-center gap-2 cursor-pointer px-3 py-2.5 border border-dashed border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                <Upload size={14} className="text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Ajouter des fichiers…</span>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => { addFiles(index, e.target.files); e.target.value = ""; }}
                />
              </label>
            </div>
          </div>
        ))}

        <button
          onClick={addStep}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-gray-200 rounded-2xl text-sm text-muted-foreground hover:bg-gray-50 hover:text-foreground transition-colors"
        >
          <Plus size={14} />
          Ajouter une étape
        </button>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {formation ? "Enregistrer" : "Créer la formation"}
        </button>
        <button
          onClick={onBack}
          className="px-5 py-2.5 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
        >
          Annuler
        </button>
      </div>
    </div>
  );
};

export default FormationForm;
