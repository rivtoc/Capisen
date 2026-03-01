import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import {
  ChevronDown, ChevronUp, Check, Play, FileText,
  Download, Upload, Loader2, Pencil, Trash2,
} from "lucide-react";

interface Formation {
  id: string;
  title: string;
  description: string | null;
}

interface StepDocument {
  id: string;
  file_name: string;
  storage_path: string;
}

interface Step {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  order_index: number;
  documents: StepDocument[];
}

interface StepProgress {
  id: string;
  step_id: string;
  completed: boolean;
}

interface StepSubmission {
  id: string;
  step_id: string;
  file_name: string;
  storage_path: string;
}

interface Props {
  formation: Formation;
  canManage: boolean;
  onBack: () => void;
  onEdit: () => void;
  onDeleted: () => void;
}

const getEmbedUrl = (url: string): string | null => {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
};

const FormationDetail = ({ formation, canManage, onBack, onEdit, onDeleted }: Props) => {
  const { user } = useAuth();
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollment, setEnrollment] = useState<{ id: string } | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [progress, setProgress] = useState<StepProgress[]>([]);
  const [submissions, setSubmissions] = useState<StepSubmission[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      const { data: stepsData } = await supabase
        .from("steps")
        .select("*, step_documents(*)")
        .eq("formation_id", formation.id)
        .order("order_index");

      const loadedSteps: Step[] = (stepsData ?? []).map((s: any) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        video_url: s.video_url,
        order_index: s.order_index,
        documents: s.step_documents ?? [],
      }));
      setSteps(loadedSteps);

      if (user) {
        const { data: enrollData } = await supabase
          .from("enrollments")
          .select("id")
          .eq("formation_id", formation.id)
          .eq("user_id", user.id)
          .maybeSingle();

        setEnrollment(enrollData);

        if (enrollData) {
          const [{ data: prog }, { data: subs }] = await Promise.all([
            supabase.from("step_progress").select("*").eq("enrollment_id", enrollData.id),
            supabase.from("step_submissions").select("*").eq("enrollment_id", enrollData.id),
          ]);
          setProgress(prog ?? []);
          setSubmissions(subs ?? []);
        }
      }

      setLoading(false);
    };

    loadData();
  }, [formation.id, user]);

  const handleEnroll = async () => {
    if (!user) return;
    setEnrolling(true);
    const { data } = await supabase
      .from("enrollments")
      .insert({ formation_id: formation.id, user_id: user.id })
      .select("id")
      .single();
    setEnrollment(data);
    setEnrolling(false);
    if (steps.length > 0) setExpanded(steps[0].id);
  };

  const handleCompleteStep = async (stepId: string) => {
    if (!enrollment) return;
    const existing = progress.find((p) => p.step_id === stepId);
    if (existing) {
      const newVal = !existing.completed;
      await supabase
        .from("step_progress")
        .update({ completed: newVal, completed_at: newVal ? new Date().toISOString() : null })
        .eq("id", existing.id);
      setProgress((prev) =>
        prev.map((p) => (p.step_id === stepId ? { ...p, completed: newVal } : p))
      );
    } else {
      const { data } = await supabase
        .from("step_progress")
        .insert({
          enrollment_id: enrollment.id,
          step_id: stepId,
          completed: true,
          completed_at: new Date().toISOString(),
        })
        .select("*")
        .single();
      if (data) setProgress((prev) => [...prev, data]);
    }
  };

  const handleSubmitFile = async (stepId: string, file: File) => {
    if (!enrollment || !user) return;
    setUploading(stepId);
    const safeName = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `submissions/${enrollment.id}/${stepId}/${Date.now()}_${safeName}`;
    const { error } = await supabase.storage.from("formations").upload(path, file);
    if (!error) {
      const { data } = await supabase
        .from("step_submissions")
        .insert({ enrollment_id: enrollment.id, step_id: stepId, file_name: file.name, storage_path: path })
        .select("*")
        .single();
      if (data) setSubmissions((prev) => [...prev, data]);
    }
    setUploading(null);
  };

  const handleDownload = async (doc: StepDocument) => {
    const { data } = await supabase.storage
      .from("formations")
      .createSignedUrl(doc.storage_path, 60);
    if (data?.signedUrl) {
      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = doc.file_name;
      a.click();
    }
  };

  const handleDelete = async () => {
    if (!confirm("Supprimer cette formation ? Cette action est irréversible.")) return;
    setDeleting(true);
    await supabase.from("formations").delete().eq("id", formation.id);
    onDeleted();
  };

  const completedCount = progress.filter((p) => p.completed).length;

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Chargement…</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <button
          onClick={onBack}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-1"
        >
          ← Retour
        </button>
        {canManage && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Pencil size={12} />
              Modifier
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-red-100 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              <Trash2 size={12} />
              Supprimer
            </button>
          </div>
        )}
      </div>

      <h2 className="text-2xl font-bold text-foreground mb-1">{formation.title}</h2>
      {formation.description && (
        <p className="text-sm text-muted-foreground mb-6">{formation.description}</p>
      )}

      {/* Barre de progression */}
      {enrollment && steps.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Progression</span>
            <span className="text-sm text-muted-foreground">
              {completedCount} / {steps.length} étapes
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-black rounded-full h-2 transition-all duration-300"
              style={{ width: `${(completedCount / steps.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* CTA inscription */}
      {!enrollment && !canManage && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Inscrivez-vous pour accéder aux étapes et suivre votre progression.
          </p>
          <button
            onClick={handleEnroll}
            disabled={enrolling}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {enrolling && <Loader2 size={14} className="animate-spin" />}
            S'inscrire à cette formation
          </button>
        </div>
      )}

      {/* Étapes */}
      {steps.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-white border border-gray-200 rounded-2xl">
          <p className="text-sm">Aucune étape configurée pour cette formation.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {steps.map((step, index) => {
            const isExpanded = expanded === step.id;
            const isCompleted = progress.find((p) => p.step_id === step.id)?.completed ?? false;
            const stepSubs = submissions.filter((s) => s.step_id === step.id);
            const embedUrl = step.video_url ? getEmbedUrl(step.video_url) : null;
            const canAccess = !!enrollment || canManage;

            return (
              <div
                key={step.id}
                className={`bg-white border rounded-2xl overflow-hidden transition-colors ${
                  isCompleted ? "border-green-200" : "border-gray-200"
                }`}
              >
                <button
                  onClick={() => canAccess && setExpanded(isExpanded ? null : step.id)}
                  disabled={!canAccess}
                  className={`w-full flex items-center gap-3 px-5 py-4 text-left transition-colors ${
                    canAccess ? "hover:bg-gray-50" : "cursor-default"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                      isCompleted
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? <Check size={14} /> : index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{step.title}</p>
                    {!canAccess && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Inscrivez-vous pour accéder à cette étape
                      </p>
                    )}
                  </div>
                  {canAccess && (
                    isExpanded
                      ? <ChevronUp size={16} className="text-muted-foreground shrink-0" />
                      : <ChevronDown size={16} className="text-muted-foreground shrink-0" />
                  )}
                </button>

                {isExpanded && canAccess && (
                  <div className="px-5 pb-5 pt-4 border-t border-gray-100 space-y-4">
                    {/* Vidéo */}
                    {step.video_url && (
                      <div>
                        {embedUrl ? (
                          <div className="aspect-video rounded-xl overflow-hidden bg-black">
                            <iframe
                              src={embedUrl}
                              className="w-full h-full"
                              allowFullScreen
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            />
                          </div>
                        ) : (
                          <a
                            href={step.video_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-blue-600 hover:underline"
                          >
                            <Play size={14} />
                            Voir la vidéo
                          </a>
                        )}
                      </div>
                    )}

                    {/* Contenu texte */}
                    {step.description && (
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    )}

                    {/* Documents à télécharger */}
                    {step.documents.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                          Documents
                        </p>
                        <div className="flex flex-col gap-1.5">
                          {step.documents.map((doc) => (
                            <button
                              key={doc.id}
                              onClick={() => handleDownload(doc)}
                              className="flex items-center gap-3 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition-colors text-left"
                            >
                              <FileText size={14} className="text-muted-foreground shrink-0" />
                              <span className="flex-1 truncate text-foreground">{doc.file_name}</span>
                              <Download size={14} className="text-muted-foreground shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Rendu formé */}
                    {enrollment && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                          Votre rendu
                        </p>
                        {stepSubs.length > 0 && (
                          <div className="flex flex-col gap-1.5 mb-2">
                            {stepSubs.map((sub) => (
                              <div
                                key={sub.id}
                                className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-xl text-sm"
                              >
                                <FileText size={14} className="text-blue-500 shrink-0" />
                                <span className="flex-1 truncate text-foreground">{sub.file_name}</span>
                                <span className="text-xs text-blue-500">Envoyé</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <label className="flex items-center gap-2 cursor-pointer px-4 py-2.5 border border-dashed border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                          {uploading === step.id ? (
                            <Loader2 size={14} className="animate-spin text-muted-foreground" />
                          ) : (
                            <Upload size={14} className="text-muted-foreground" />
                          )}
                          <span className="text-sm text-muted-foreground">
                            {uploading === step.id ? "Envoi en cours…" : "Déposer un fichier"}
                          </span>
                          <input
                            type="file"
                            className="hidden"
                            disabled={uploading === step.id}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleSubmitFile(step.id, file);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </div>
                    )}

                    {/* Marquer comme complétée */}
                    {enrollment && (
                      <button
                        onClick={() => handleCompleteStep(step.id)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm rounded-xl border transition-colors ${
                          isCompleted
                            ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                            : "bg-white border-gray-200 text-foreground hover:bg-gray-50"
                        }`}
                      >
                        <Check size={14} />
                        {isCompleted ? "Étape complétée ✓" : "Marquer comme complétée"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FormationDetail;
