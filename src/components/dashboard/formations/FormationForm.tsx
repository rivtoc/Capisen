import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Trash2, ChevronUp, ChevronDown, Loader2, X, FileText, Upload, Trophy } from "lucide-react";
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
  requires_file: boolean;
  requires_text: boolean;
  newFiles: File[];
  existingDocuments: StepDocument[];
}

interface QuizChoiceFormData {
  label: string;
  is_correct: boolean;
}

interface QuizQuestionFormData {
  question: string;
  choices: QuizChoiceFormData[];
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
  requires_file: false,
  requires_text: false,
  newFiles: [],
  existingDocuments: [],
});

const emptyQuestion = (): QuizQuestionFormData => ({
  question: "",
  choices: [
    { label: "", is_correct: false },
    { label: "", is_correct: false },
  ],
});

const FormationForm = ({ pole, formation, onBack, onSaved }: Props) => {
  const { user } = useAuth();
  const [title, setTitle] = useState(formation?.title ?? "");
  const [description, setDescription] = useState(formation?.description ?? "");
  const [steps, setSteps] = useState<StepFormData[]>([emptyStep()]);
  const [loadingSteps, setLoadingSteps] = useState(!!formation);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quiz
  const [hasQuiz, setHasQuiz] = useState(false);
  const [existingQuizId, setExistingQuizId] = useState<string | undefined>(undefined);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestionFormData[]>([emptyQuestion()]);

  useEffect(() => {
    if (!formation) return;
    const load = async () => {
      const [{ data: stepsData }, { data: quizData }] = await Promise.all([
        supabase
          .from("steps")
          .select("*, step_documents(*)")
          .eq("formation_id", formation.id)
          .order("order_index"),
        supabase
          .from("quizzes")
          .select("id, quiz_questions(id, question, order_index, quiz_choices(id, label, is_correct))")
          .eq("formation_id", formation.id)
          .maybeSingle(),
      ]);

      if (stepsData && stepsData.length > 0) {
        setSteps(
          stepsData.map((s: any) => ({
            id: s.id,
            title: s.title,
            description: s.description ?? "",
            video_url: s.video_url ?? "",
            requires_file: s.requires_file ?? false,
            requires_text: s.requires_text ?? false,
            newFiles: [],
            existingDocuments: s.step_documents ?? [],
          }))
        );
      }

      if (quizData) {
        setExistingQuizId(quizData.id);
        setHasQuiz(true);
        const sorted = ((quizData as any).quiz_questions ?? [])
          .sort((a: any, b: any) => a.order_index - b.order_index)
          .map((q: any) => ({
            question: q.question,
            choices: (q.quiz_choices ?? []).map((c: any) => ({
              label: c.label,
              is_correct: c.is_correct,
            })),
          }));
        if (sorted.length > 0) setQuizQuestions(sorted);
      }

      setLoadingSteps(false);
    };
    load();
  }, [formation]);

  // ── Steps helpers ─────────────────────────────────────────
  const updateStep = (index: number, patch: Partial<StepFormData>) =>
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  const addStep = () => setSteps((prev) => [...prev, emptyStep()]);

  const removeStep = (index: number) =>
    setSteps((prev) => prev.filter((_, i) => i !== index));

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

  const removeNewFile = (si: number, fi: number) =>
    updateStep(si, { newFiles: steps[si].newFiles.filter((_, i) => i !== fi) });

  const removeExistingDoc = (si: number, docId: string) =>
    updateStep(si, { existingDocuments: steps[si].existingDocuments.filter((d) => d.id !== docId) });

  // ── Quiz helpers ──────────────────────────────────────────
  const updateQuestion = (qi: number, patch: Partial<QuizQuestionFormData>) =>
    setQuizQuestions((prev) => prev.map((q, i) => (i === qi ? { ...q, ...patch } : q)));

  const addQuestion = () => setQuizQuestions((prev) => [...prev, emptyQuestion()]);

  const removeQuestion = (qi: number) =>
    setQuizQuestions((prev) => prev.filter((_, i) => i !== qi));

  const updateChoice = (qi: number, ci: number, patch: Partial<QuizChoiceFormData>) =>
    setQuizQuestions((prev) =>
      prev.map((q, i) =>
        i === qi ? { ...q, choices: q.choices.map((c, j) => (j === ci ? { ...c, ...patch } : c)) } : q
      )
    );

  const setCorrectChoice = (qi: number, ci: number) =>
    setQuizQuestions((prev) =>
      prev.map((q, i) =>
        i === qi
          ? { ...q, choices: q.choices.map((c, j) => ({ ...c, is_correct: j === ci })) }
          : q
      )
    );

  const addChoice = (qi: number) => {
    if (quizQuestions[qi].choices.length >= 4) return;
    updateQuestion(qi, { choices: [...quizQuestions[qi].choices, { label: "", is_correct: false }] });
  };

  const removeChoice = (qi: number, ci: number) => {
    if (quizQuestions[qi].choices.length <= 2) return;
    updateQuestion(qi, { choices: quizQuestions[qi].choices.filter((_, j) => j !== ci) });
  };

  // ── Save ─────────────────────────────────────────────────
  const handleSave = async () => {
    if (!title.trim()) { setError("Le titre de la formation est requis."); return; }
    if (steps.some((s) => !s.title.trim())) { setError("Chaque étape doit avoir un titre."); return; }
    if (hasQuiz) {
      for (const q of quizQuestions) {
        if (!q.question.trim()) { setError("Chaque question du quiz doit avoir un énoncé."); return; }
        if (q.choices.some((c) => !c.label.trim())) { setError("Chaque réponse du quiz doit avoir un texte."); return; }
        if (!q.choices.some((c) => c.is_correct)) { setError("Chaque question doit avoir une bonne réponse cochée."); return; }
      }
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

        const { data: dbSteps } = await supabase.from("steps").select("id").eq("formation_id", formationId);
        const keptIds = new Set(steps.filter((s) => s.id).map((s) => s.id));
        const toDelete = (dbSteps ?? []).filter((s: any) => !keptIds.has(s.id));
        for (const s of toDelete) {
          await supabase.from("step_documents").delete().eq("step_id", s.id);
          await supabase.from("steps").delete().eq("id", s.id);
        }
      }

      // Upsert steps
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        let stepId = step.id;

        if (stepId) {
          await supabase.from("steps").update({
            title: step.title.trim(),
            description: step.description || null,
            video_url: step.video_url || null,
            order_index: i,
            requires_file: step.requires_file,
            requires_text: step.requires_text,
          }).eq("id", stepId);

          const { data: dbDocs } = await supabase.from("step_documents").select("id").eq("step_id", stepId);
          const keptDocIds = new Set(step.existingDocuments.map((d) => d.id));
          const docsToDelete = (dbDocs ?? []).filter((d: any) => !keptDocIds.has(d.id));
          if (docsToDelete.length > 0) {
            await supabase.from("step_documents").delete().in("id", docsToDelete.map((d: any) => d.id));
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
              requires_file: step.requires_file,
              requires_text: step.requires_text,
            })
            .select("id")
            .single();
          if (e) throw e;
          stepId = newStep.id;
        }

        for (const file of step.newFiles) {
          const safeName = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");
          const path = `steps/${stepId}/${Date.now()}_${safeName}`;
          const { error: uploadErr } = await supabase.storage.from("formations").upload(path, file);
          if (uploadErr) throw uploadErr;
          await supabase.from("step_documents").insert({ step_id: stepId, file_name: file.name, storage_path: path, uploaded_by: user?.id });
        }
      }

      // Save quiz
      if (!hasQuiz) {
        if (existingQuizId) {
          await supabase.from("quizzes").delete().eq("id", existingQuizId);
        }
      } else {
        let quizId = existingQuizId;
        if (!quizId) {
          const { data: qz, error: e } = await supabase
            .from("quizzes")
            .insert({ formation_id: formationId })
            .select("id")
            .single();
          if (e) throw e;
          quizId = qz.id;
        }

        // Delete all questions (cascade deletes choices) then re-insert
        await supabase.from("quiz_questions").delete().eq("quiz_id", quizId);

        for (let i = 0; i < quizQuestions.length; i++) {
          const q = quizQuestions[i];
          const { data: newQ, error: e } = await supabase
            .from("quiz_questions")
            .insert({ quiz_id: quizId, question: q.question.trim(), order_index: i })
            .select("id")
            .single();
          if (e) throw e;
          for (const c of q.choices) {
            await supabase.from("quiz_choices").insert({
              question_id: newQ.id,
              label: c.label.trim(),
              is_correct: c.is_correct,
            });
          }
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
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
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
            Description <span className="text-muted-foreground font-normal">(optionnel)</span>
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
            Étapes <span className="text-muted-foreground font-normal">({steps.length})</span>
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
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Étape {index + 1}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => moveStep(index, -1)} disabled={index === 0}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors" title="Monter">
                  <ChevronUp size={14} className="text-muted-foreground" />
                </button>
                <button onClick={() => moveStep(index, 1)} disabled={index === steps.length - 1}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors" title="Descendre">
                  <ChevronDown size={14} className="text-muted-foreground" />
                </button>
                <button onClick={() => removeStep(index)} disabled={steps.length === 1}
                  className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 disabled:opacity-30 transition-colors" title="Supprimer">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Titre *</label>
              <input type="text" value={step.title}
                onChange={(e) => updateStep(index, { title: e.target.value })}
                placeholder="Ex : Comprendre les bases de la prospection"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">
                Contenu <span className="text-muted-foreground font-normal">(optionnel)</span>
              </label>
              <textarea value={step.description}
                onChange={(e) => updateStep(index, { description: e.target.value })}
                rows={4} placeholder="Instructions, explications, consignes à reproduire…"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">
                Lien vidéo <span className="text-muted-foreground font-normal">(optionnel)</span>
              </label>
              <input type="url" value={step.video_url}
                onChange={(e) => updateStep(index, { video_url: e.target.value })}
                placeholder="https://youtu.be/… ou https://vimeo.com/…"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">
                Requis pour valider l'étape <span className="text-muted-foreground font-normal">(optionnel)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => updateStep(index, { requires_file: !step.requires_file })}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-colors ${step.requires_file ? "bg-black text-white border-black" : "bg-white text-foreground border-gray-200 hover:border-gray-400"}`}>
                  <Upload size={13} /> Fichier
                </button>
                <button type="button" onClick={() => updateStep(index, { requires_text: !step.requires_text })}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-colors ${step.requires_text ? "bg-black text-white border-black" : "bg-white text-foreground border-gray-200 hover:border-gray-400"}`}>
                  <FileText size={13} /> Réponse textuelle
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">
                Documents <span className="text-muted-foreground font-normal">(à télécharger par le formé, optionnel)</span>
              </label>
              {step.existingDocuments.length > 0 && (
                <div className="flex flex-col gap-1">
                  {step.existingDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                      <FileText size={14} className="text-muted-foreground shrink-0" />
                      <span className="flex-1 truncate text-foreground">{doc.file_name}</span>
                      <button onClick={() => removeExistingDoc(index, doc.id)} className="text-muted-foreground hover:text-red-600 transition-colors">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {step.newFiles.length > 0 && (
                <div className="flex flex-col gap-1">
                  {step.newFiles.map((f, fi) => (
                    <div key={fi} className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-sm">
                      <FileText size={14} className="text-blue-500 shrink-0" />
                      <span className="flex-1 truncate text-foreground">{f.name}</span>
                      <button onClick={() => removeNewFile(index, fi)} className="text-muted-foreground hover:text-red-600 transition-colors">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <label className="flex items-center gap-2 cursor-pointer px-3 py-2.5 border border-dashed border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                <Upload size={14} className="text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Ajouter des fichiers…</span>
                <input type="file" multiple className="hidden"
                  onChange={(e) => { addFiles(index, e.target.files); e.target.value = ""; }} />
              </label>
            </div>
          </div>
        ))}

        <button onClick={addStep}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-gray-200 rounded-2xl text-sm text-muted-foreground hover:bg-gray-50 hover:text-foreground transition-colors">
          <Plus size={14} />
          Ajouter une étape
        </button>
      </div>

      {/* Quiz de fin de parcours */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => setHasQuiz(!hasQuiz)}
          className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl border text-left transition-colors ${
            hasQuiz ? "bg-black text-white border-black" : "bg-white text-foreground border-gray-200 hover:border-gray-400"
          }`}
        >
          <Trophy size={16} className="shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Quiz de fin de parcours</p>
            <p className={`text-xs mt-0.5 ${hasQuiz ? "text-white/70" : "text-muted-foreground"}`}>
              {hasQuiz
                ? "Activé — les membres répondent au quiz après avoir terminé toutes les étapes"
                : "Optionnel — ajoutez des questions à choix multiples à la fin de la formation"}
            </p>
          </div>
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
            hasQuiz ? "bg-white border-white" : "border-gray-300"
          }`}>
            {hasQuiz && <div className="w-2.5 h-2.5 rounded-full bg-black" />}
          </div>
        </button>

        {hasQuiz && (
          <div className="mt-4 space-y-4">
            {quizQuestions.map((q, qi) => (
              <div key={qi} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Question {qi + 1}
                  </span>
                  <button
                    onClick={() => removeQuestion(qi)}
                    disabled={quizQuestions.length === 1}
                    className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 disabled:opacity-30 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">Énoncé *</label>
                  <input
                    type="text"
                    value={q.question}
                    onChange={(e) => updateQuestion(qi, { question: e.target.value })}
                    placeholder="Ex : Qu'est-ce que la prospection à froid ?"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Réponses{" "}
                    <span className="text-muted-foreground font-normal">(2 à 4 — cliquez le cercle pour marquer la bonne)</span>
                  </label>
                  {q.choices.map((c, ci) => (
                    <div key={ci} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCorrectChoice(qi, ci)}
                        title="Marquer comme bonne réponse"
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          c.is_correct ? "bg-black border-black" : "border-gray-300 hover:border-gray-500"
                        }`}
                      >
                        {c.is_correct && <div className="w-2 h-2 rounded-full bg-white" />}
                      </button>
                      <input
                        type="text"
                        value={c.label}
                        onChange={(e) => updateChoice(qi, ci, { label: e.target.value })}
                        placeholder={`Réponse ${ci + 1}`}
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition"
                      />
                      <button
                        onClick={() => removeChoice(qi, ci)}
                        disabled={q.choices.length <= 2}
                        className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 disabled:opacity-30 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {q.choices.length < 4 && (
                    <button
                      onClick={() => addChoice(qi)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
                    >
                      <Plus size={11} />
                      Ajouter une réponse
                    </button>
                  )}
                </div>
              </div>
            ))}

            <button
              onClick={addQuestion}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-gray-200 rounded-2xl text-sm text-muted-foreground hover:bg-gray-50 hover:text-foreground transition-colors"
            >
              <Plus size={14} />
              Ajouter une question
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <div className="flex gap-3">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors">
          {saving && <Loader2 size={14} className="animate-spin" />}
          {formation ? "Enregistrer" : "Créer la formation"}
        </button>
        <button onClick={onBack}
          className="px-5 py-2.5 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
          Annuler
        </button>
      </div>
    </div>
  );
};

export default FormationForm;
