import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import {
  ChevronDown, ChevronUp, Check, Play, FileText,
  Download, Upload, Loader2, Pencil, Trash2, Lock, Trophy,
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
  requires_file: boolean;
  requires_text: boolean;
  documents: StepDocument[];
}

interface StepProgress {
  id: string;
  step_id: string;
  completed: boolean;
  text_answer: string | null;
}

interface StepSubmission {
  id: string;
  step_id: string;
  file_name: string;
  storage_path: string;
}

interface QuizChoice {
  id: string;
  label: string;
  is_correct: boolean;
}

interface QuizQuestion {
  id: string;
  question: string;
  order_index: number;
  choices: QuizChoice[];
}

interface Quiz {
  id: string;
  questions: QuizQuestion[];
}

interface QuizAttempt {
  id: string;
  score: number;
  total: number;
  answers: Record<string, string>; // question_id → choice_id
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
  const [completing, setCompleting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});
  // Quiz
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [quizAttempt, setQuizAttempt] = useState<QuizAttempt | null>(null);
  const [quizStarted, setQuizStarted] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [quizExpanded, setQuizExpanded] = useState(false);

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
        requires_file: s.requires_file ?? false,
        requires_text: s.requires_text ?? false,
        documents: s.step_documents ?? [],
      }));
      setSteps(loadedSteps);

      // Load quiz
      const { data: quizData } = await supabase
        .from("quizzes")
        .select("id, quiz_questions(id, question, order_index, quiz_choices(id, label, is_correct))")
        .eq("formation_id", formation.id)
        .maybeSingle();

      if (quizData) {
        const questions: QuizQuestion[] = ((quizData as any).quiz_questions ?? [])
          .sort((a: any, b: any) => a.order_index - b.order_index)
          .map((q: any) => ({
            id: q.id,
            question: q.question,
            order_index: q.order_index,
            choices: (q.quiz_choices ?? []).map((c: any) => ({
              id: c.id,
              label: c.label,
              is_correct: c.is_correct,
            })),
          }));
        setQuiz({ id: quizData.id, questions });
      }

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
          const loadedProg: StepProgress[] = (prog ?? []).map((p: any) => ({
            id: p.id,
            step_id: p.step_id,
            completed: p.completed,
            text_answer: p.text_answer ?? null,
          }));
          setProgress(loadedProg);
          const saved: Record<string, string> = {};
          for (const p of loadedProg) {
            if (p.text_answer) saved[p.step_id] = p.text_answer;
          }
          setTextAnswers(saved);
          setSubmissions(subs ?? []);

          // Load quiz attempt if quiz exists
          if (quizData) {
            const { data: attemptData } = await supabase
              .from("quiz_attempts")
              .select("id, score, total")
              .eq("quiz_id", quizData.id)
              .eq("enrollment_id", enrollData.id)
              .maybeSingle();
            if (attemptData) {
              const { data: answersData } = await supabase
                .from("quiz_answers")
                .select("question_id, choice_id")
                .eq("attempt_id", attemptData.id);
              const answers: Record<string, string> = {};
              for (const a of (answersData ?? [])) {
                answers[(a as any).question_id] = (a as any).choice_id;
              }
              setQuizAttempt({ ...(attemptData as any), answers });
            }
          }
        }
      }

      setLoading(false);
    };

    loadData();
  }, [formation.id, user]);

  // ── Helpers ──────────────────────────────────────────────
  const isStepAccessible = (index: number): boolean => {
    if (!enrollment) return canManage; // sans inscription : admins voient tout, autres rien
    if (index === 0) return true;
    const prev = steps[index - 1];
    return progress.find((p) => p.step_id === prev.id)?.completed ?? false;
  };

  const isStepCompleted = (stepId: string) =>
    progress.find((p) => p.step_id === stepId)?.completed ?? false;

  const canCompleteStep = (step: Step): boolean => {
    if (isStepCompleted(step.id)) return false;
    if (step.requires_file && !submissions.some((s) => s.step_id === step.id)) return false;
    if (step.requires_text && !(textAnswers[step.id] ?? "").trim()) return false;
    return true;
  };

  // ── Actions ───────────────────────────────────────────────
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

  const handleCompleteStep = async (step: Step) => {
    if (!enrollment || !canCompleteStep(step)) return;
    setCompleting(step.id);

    const textAnswer = step.requires_text
      ? (textAnswers[step.id] ?? "").trim() || null
      : null;

    const existing = progress.find((p) => p.step_id === step.id);
    let newProg: StepProgress;

    if (existing) {
      const { data } = await supabase
        .from("step_progress")
        .update({ completed: true, completed_at: new Date().toISOString(), text_answer: textAnswer })
        .eq("id", existing.id)
        .select("*")
        .single();
      newProg = { ...(data as any), text_answer: textAnswer };
      setProgress((prev) => prev.map((p) => (p.id === existing.id ? newProg : p)));
    } else {
      const { data } = await supabase
        .from("step_progress")
        .insert({
          enrollment_id: enrollment.id,
          step_id: step.id,
          completed: true,
          completed_at: new Date().toISOString(),
          text_answer: textAnswer,
        })
        .select("*")
        .single();
      newProg = { ...(data as any), text_answer: textAnswer };
      setProgress((prev) => [...prev, newProg]);
    }

    // Auto-expand next step
    const currentIndex = steps.findIndex((s) => s.id === step.id);
    if (currentIndex >= 0 && currentIndex < steps.length - 1) {
      setExpanded(steps[currentIndex + 1].id);
    } else {
      setExpanded(null);
    }

    setCompleting(null);
  };

  const handleSubmitQuiz = async () => {
    if (!quiz || !enrollment) return;
    setSubmittingQuiz(true);

    let score = 0;
    for (const q of quiz.questions) {
      const choiceId = selectedAnswers[q.id];
      if (choiceId && q.choices.find((c) => c.id === choiceId)?.is_correct) score++;
    }

    const { data: attempt } = await supabase
      .from("quiz_attempts")
      .insert({ quiz_id: quiz.id, enrollment_id: enrollment.id, score, total: quiz.questions.length })
      .select("id")
      .single();

    if (attempt) {
      for (const [questionId, choiceId] of Object.entries(selectedAnswers)) {
        await supabase.from("quiz_answers").insert({
          attempt_id: attempt.id,
          question_id: questionId,
          choice_id: choiceId,
        });
      }
      setQuizAttempt({ id: attempt.id, score, total: quiz.questions.length });
      setQuizStarted(false);
    }
    setSubmittingQuiz(false);
  };

  const handleSubmitFile = async (stepId: string, file: File) => {
    if (!enrollment || !user) return;
    setUploading(stepId);
    const safeName = file.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `submissions/${enrollment.id}/${stepId}/${Date.now()}_${safeName}`;
    const { error } = await supabase.storage.from("formations").upload(path, file);
    if (!error) {
      const { data } = await supabase
        .from("step_submissions")
        .insert({ enrollment_id: enrollment.id, step_id: stepId, file_name: file.name, storage_path: path })
        .select("*")
        .single();
      if (data) setSubmissions((prev) => [...prev, data as StepSubmission]);
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
      {!enrollment && (
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
            const accessible = isStepAccessible(index);
            const completed = isStepCompleted(step.id);
            const isExpanded = expanded === step.id;
            const stepSubs = submissions.filter((s) => s.step_id === step.id);
            const embedUrl = step.video_url ? getEmbedUrl(step.video_url) : null;
            const savedTextAnswer = progress.find((p) => p.step_id === step.id)?.text_answer;

            return (
              <div
                key={step.id}
                className={`bg-white border rounded-2xl overflow-hidden transition-colors ${
                  completed
                    ? "border-green-200"
                    : !accessible
                    ? "border-gray-100 opacity-60"
                    : "border-gray-200"
                }`}
              >
                {/* En-tête étape */}
                <button
                  onClick={() => accessible && setExpanded(isExpanded ? null : step.id)}
                  disabled={!accessible}
                  className={`w-full flex items-center gap-3 px-5 py-4 text-left transition-colors ${
                    accessible ? "hover:bg-gray-50" : "cursor-default"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                      completed
                        ? "bg-green-100 text-green-700"
                        : !accessible
                        ? "bg-gray-100 text-gray-300"
                        : "bg-gray-100 text-muted-foreground"
                    }`}
                  >
                    {completed ? (
                      <Check size={14} />
                    ) : !accessible ? (
                      <Lock size={13} />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${accessible ? "text-foreground" : "text-muted-foreground"}`}>
                      {step.title}
                    </p>
                    {!accessible && enrollment && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Complétez l'étape précédente pour débloquer
                      </p>
                    )}
                    {!accessible && !enrollment && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Inscrivez-vous pour accéder à cette étape
                      </p>
                    )}
                  </div>
                  {/* Badges requis */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {step.requires_file && (
                      <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-muted-foreground rounded">
                        Fichier
                      </span>
                    )}
                    {step.requires_text && (
                      <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-muted-foreground rounded">
                        Texte
                      </span>
                    )}
                  </div>
                  {accessible && (
                    isExpanded
                      ? <ChevronUp size={16} className="text-muted-foreground shrink-0" />
                      : <ChevronDown size={16} className="text-muted-foreground shrink-0" />
                  )}
                </button>

                {isExpanded && accessible && (
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

                    {/* Réponse textuelle */}
                    {enrollment && step.requires_text && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                          Votre réponse <span className="text-red-400">*</span>
                        </p>
                        {completed && savedTextAnswer ? (
                          <div className="px-4 py-3 bg-green-50 border border-green-100 rounded-xl text-sm text-foreground whitespace-pre-wrap">
                            {savedTextAnswer}
                          </div>
                        ) : (
                          <textarea
                            value={textAnswers[step.id] ?? ""}
                            onChange={(e) =>
                              setTextAnswers((prev) => ({ ...prev, [step.id]: e.target.value }))
                            }
                            disabled={completed}
                            rows={4}
                            placeholder="Rédigez votre réponse ici…"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition disabled:opacity-50"
                          />
                        )}
                      </div>
                    )}

                    {/* Upload fichier */}
                    {enrollment && step.requires_file && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                          Votre fichier <span className="text-red-400">*</span>
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
                        {!completed && (
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
                        )}
                      </div>
                    )}

                    {/* Bouton compléter */}
                    {enrollment && (
                      <button
                        onClick={() => handleCompleteStep(step)}
                        disabled={completed || !canCompleteStep(step) || completing === step.id}
                        className={`flex items-center gap-2 px-4 py-2 text-sm rounded-xl border transition-colors ${
                          completed
                            ? "bg-green-50 border-green-200 text-green-700 cursor-default"
                            : canCompleteStep(step)
                            ? "bg-black text-white border-black hover:bg-gray-800"
                            : "bg-white border-gray-200 text-muted-foreground cursor-not-allowed opacity-50"
                        }`}
                      >
                        {completing === step.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Check size={14} />
                        )}
                        {completed ? "Étape complétée ✓" : "Valider l'étape"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Quiz de fin de parcours */}
      {quiz && enrollment && (steps.length === 0 || completedCount === steps.length) && (
        <div className="mt-6">
          {quizAttempt ? (
            <div className="bg-white border border-green-200 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <Trophy size={18} className="text-green-700" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground text-sm">Quiz terminé</p>
                  <p className="text-xs text-muted-foreground">Formation complète</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-bold text-foreground">{quizAttempt.score}/{quizAttempt.total}</p>
                  <p className="text-xs text-muted-foreground">Score final</p>
                </div>
              </div>
              <button
                onClick={() => setQuizExpanded(!quizExpanded)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {quizExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                {quizExpanded ? "Masquer le détail" : "Voir le détail des réponses"}
              </button>
              {quizExpanded && quiz && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-5">
                  {quiz.questions.map((q, qi) => {
                    const selectedId = quizAttempt.answers[q.id];
                    const selected = q.choices.find((c) => c.id === selectedId);
                    return (
                      <div key={q.id}>
                        <p className="text-xs font-medium text-foreground mb-2">
                          {qi + 1}. {q.question}
                        </p>
                        <div className="space-y-1.5">
                          {q.choices.map((c) => {
                            const wasSelected = c.id === selectedId;
                            const showCorrect = c.is_correct && selected && !selected.is_correct;
                            return (
                              <div
                                key={c.id}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
                                  wasSelected && c.is_correct
                                    ? "bg-green-50 border border-green-200 text-green-700"
                                    : wasSelected && !c.is_correct
                                    ? "bg-red-50 border border-red-200 text-red-700"
                                    : showCorrect
                                    ? "bg-gray-50 border border-gray-200 text-muted-foreground"
                                    : "text-muted-foreground"
                                }`}
                              >
                                <div
                                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                    wasSelected && c.is_correct
                                      ? "bg-green-500"
                                      : wasSelected && !c.is_correct
                                      ? "bg-red-500"
                                      : showCorrect
                                      ? "bg-gray-300"
                                      : "bg-transparent"
                                  }`}
                                />
                                <span className="flex-1">{c.label}</span>
                                {showCorrect && (
                                  <span className="text-[10px] text-muted-foreground shrink-0">
                                    Bonne réponse
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : quizStarted ? (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">
                Quiz de fin de parcours ({quiz.questions.length} question{quiz.questions.length > 1 ? "s" : ""})
              </h3>
              {quiz.questions.map((q, qi) => (
                <div key={q.id} className="bg-white border border-gray-200 rounded-2xl p-5">
                  <p className="text-sm font-medium text-foreground mb-3">
                    {qi + 1}. {q.question}
                  </p>
                  <div className="space-y-2">
                    {q.choices.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedAnswers((prev) => ({ ...prev, [q.id]: c.id }))}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm text-left transition-colors ${
                          selectedAnswers[q.id] === c.id
                            ? "border-black bg-black text-white"
                            : "border-gray-200 hover:border-gray-300 text-foreground"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          selectedAnswers[q.id] === c.id ? "border-white" : "border-gray-300"
                        }`}>
                          {selectedAnswers[q.id] === c.id && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <button
                onClick={handleSubmitQuiz}
                disabled={submittingQuiz || quiz.questions.some((q) => !selectedAnswers[q.id])}
                className="w-full flex items-center justify-center gap-2 py-3 bg-black text-white rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {submittingQuiz && <Loader2 size={14} className="animate-spin" />}
                Terminer le quiz
              </button>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center">
              <Trophy size={28} className="mx-auto mb-3 text-muted-foreground opacity-60" />
              <p className="font-semibold text-foreground text-sm mb-1">Quiz de fin de parcours</p>
              <p className="text-xs text-muted-foreground mb-4">
                Vous avez terminé toutes les étapes ! Testez vos connaissances.
              </p>
              <button
                onClick={() => setQuizStarted(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors"
              >
                <Trophy size={14} />
                Commencer le quiz
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FormationDetail;
