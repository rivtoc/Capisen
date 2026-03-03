import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { POLE_OPTIONS, type PoleType } from "@/lib/db-types";
import { ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Check, Download, FileText, Trophy } from "lucide-react";

interface MemberProfile {
  id: string;
  full_name: string;
  pole: PoleType;
  role: string;
}

interface EnrollmentSummary {
  formationTitle: string;
  completedSteps: number;
  totalSteps: number;
}

interface StepDetail {
  id: string;
  title: string;
  order_index: number;
}

interface StepSubmission {
  id: string;
  step_id: string;
  file_name: string;
  storage_path: string;
}

interface EnrollmentDetail {
  id: string;
  formationTitle: string;
  steps: StepDetail[];
  completedStepIds: Set<string>;
  textAnswers: Record<string, string>;
  submissions: Record<string, StepSubmission[]>;
  quizAttempt: {
    score: number;
    total: number;
    questions: Array<{
      question: string;
      choices: Array<{ id: string; label: string; is_correct: boolean }>;
      selectedChoiceId: string | null;
    }>;
  } | null;
}

interface MemberDetail {
  profile: MemberProfile;
  enrollments: EnrollmentDetail[];
}

const ROLE_LABELS: Record<string, string> = {
  normal: "Membre",
  responsable: "Responsable",
  presidence: "Présidence",
};

const poleLabel = (pole: PoleType) =>
  POLE_OPTIONS.find((p) => p.value === pole)?.label ?? pole;

const handleDownload = async (storagePath: string, fileName: string) => {
  const { data } = await supabase.storage.from("formations").createSignedUrl(storagePath, 60);
  if (data?.signedUrl) {
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = fileName;
    a.click();
  }
};

const SupervisionGlobal = () => {
  const { profile } = useAuth();
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [summaries, setSummaries] = useState<Record<string, EnrollmentSummary[]>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MemberDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [expandedQuizIds, setExpandedQuizIds] = useState<Set<string>>(new Set());

  const toggleQuizDetail = (enrollmentId: string) => {
    setExpandedQuizIds((prev) => {
      const next = new Set(prev);
      if (next.has(enrollmentId)) next.delete(enrollmentId);
      else next.add(enrollmentId);
      return next;
    });
  };

  const isPresidence = profile?.role === "presidence";
  const isResponsable = profile?.role === "responsable";

  useEffect(() => {
    const load = async () => {
      let query = supabase
        .from("profiles")
        .select("id, full_name, pole, role")
        .order("full_name");

      if (isResponsable && profile?.pole) {
        query = (query as any).eq("pole", profile.pole);
      }

      const { data: membersData } = await query;
      const loadedMembers: MemberProfile[] = membersData ?? [];
      setMembers(loadedMembers);

      if (loadedMembers.length === 0) { setLoading(false); return; }

      // Load enrollments for all members
      const memberIds = loadedMembers.map((m) => m.id);
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("id, user_id, formation:formations(id, title)")
        .in("user_id", memberIds);

      if (!enrollments || enrollments.length === 0) {
        setLoading(false);
        return;
      }

      const enrollmentIds = enrollments.map((e) => e.id);
      const formationIds = [...new Set(
        enrollments.map((e) => (e.formation as any)?.id).filter(Boolean)
      )];

      const [{ data: steps }, { data: progressData }] = await Promise.all([
        supabase.from("steps").select("id, formation_id").in("formation_id", formationIds),
        supabase
          .from("step_progress")
          .select("enrollment_id, step_id, completed")
          .in("enrollment_id", enrollmentIds)
          .eq("completed", true),
      ]);

      const memberSummaries: Record<string, EnrollmentSummary[]> = {};
      for (const e of enrollments) {
        const formation = e.formation as any;
        if (!formation) continue;
        const total = (steps ?? []).filter((s: any) => s.formation_id === formation.id).length;
        const completed = (progressData ?? []).filter(
          (p: any) => p.enrollment_id === e.id
        ).length;
        if (!memberSummaries[e.user_id]) memberSummaries[e.user_id] = [];
        memberSummaries[e.user_id].push({
          formationTitle: formation.title,
          completedSteps: completed,
          totalSteps: total,
        });
      }

      setSummaries(memberSummaries);
      setLoading(false);
    };

    load();
  }, []);

  const handleSelectMember = async (member: MemberProfile) => {
    setLoadingDetail(true);

    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("id, formation:formations(id, title)")
      .eq("user_id", member.id);

    if (!enrollments || enrollments.length === 0) {
      setSelected({ profile: member, enrollments: [] });
      setLoadingDetail(false);
      return;
    }

    const enrollmentIds = enrollments.map((e) => e.id);
    const formationIds = enrollments
      .map((e) => (e.formation as any)?.id)
      .filter(Boolean);

    const [{ data: steps }, { data: progressData }, { data: subsData }, { data: quizzesData }] = await Promise.all([
      supabase
        .from("steps")
        .select("id, title, order_index, formation_id")
        .in("formation_id", formationIds)
        .order("order_index"),
      supabase
        .from("step_progress")
        .select("step_id, enrollment_id, completed, text_answer")
        .in("enrollment_id", enrollmentIds),
      supabase
        .from("step_submissions")
        .select("id, step_id, enrollment_id, file_name, storage_path")
        .in("enrollment_id", enrollmentIds),
      supabase
        .from("quizzes")
        .select("id, formation_id")
        .in("formation_id", formationIds),
    ]);

    const quizIds = (quizzesData ?? []).map((q: any) => q.id);

    const [{ data: attemptsData }, { data: questionsData }] = await Promise.all([
      quizIds.length > 0
        ? supabase
            .from("quiz_attempts")
            .select("id, quiz_id, enrollment_id, score, total")
            .in("quiz_id", quizIds)
            .in("enrollment_id", enrollmentIds)
        : Promise.resolve({ data: [] }),
      quizIds.length > 0
        ? supabase
            .from("quiz_questions")
            .select("id, quiz_id, question, order_index, quiz_choices(id, label, is_correct)")
            .in("quiz_id", quizIds)
            .order("order_index")
        : Promise.resolve({ data: [] }),
    ]);

    const attemptIds = (attemptsData ?? []).map((a: any) => a.id).filter(Boolean);
    const { data: answersData } = attemptIds.length > 0
      ? await supabase
          .from("quiz_answers")
          .select("attempt_id, question_id, choice_id")
          .in("attempt_id", attemptIds)
      : { data: [] };

    const enrollmentDetails: EnrollmentDetail[] = enrollments.map((e) => {
      const formation = e.formation as any;
      const formationSteps = (steps ?? []).filter(
        (s: any) => s.formation_id === formation?.id
      );
      const completedIds = new Set(
        (progressData ?? [])
          .filter((p: any) => p.enrollment_id === e.id && p.completed)
          .map((p: any) => p.step_id)
      );
      const textAnswers: Record<string, string> = {};
      for (const p of (progressData ?? []).filter((p: any) => p.enrollment_id === e.id)) {
        if ((p as any).text_answer) textAnswers[(p as any).step_id] = (p as any).text_answer;
      }
      const submissions: Record<string, StepSubmission[]> = {};
      for (const s of (subsData ?? []).filter((s: any) => s.enrollment_id === e.id)) {
        if (!submissions[s.step_id]) submissions[s.step_id] = [];
        submissions[s.step_id].push(s as StepSubmission);
      }
      const formationQuiz = (quizzesData ?? []).find((q: any) => q.formation_id === formation?.id);
      const attempt = formationQuiz
        ? (attemptsData ?? []).find((a: any) => a.quiz_id === formationQuiz.id && a.enrollment_id === e.id)
        : null;

      let quizAttempt: EnrollmentDetail["quizAttempt"] = null;
      if (attempt) {
        const attemptAnswers = (answersData ?? []).filter((a: any) => a.attempt_id === attempt.id);
        const answerMap: Record<string, string> = {};
        for (const a of attemptAnswers) answerMap[(a as any).question_id] = (a as any).choice_id;

        const formationQuestions = (questionsData ?? [])
          .filter((q: any) => q.quiz_id === formationQuiz?.id)
          .map((q: any) => ({
            question: q.question,
            choices: (q.quiz_choices ?? []).map((c: any) => ({
              id: c.id,
              label: c.label,
              is_correct: c.is_correct,
            })),
            selectedChoiceId: answerMap[q.id] ?? null,
          }));

        quizAttempt = {
          score: attempt.score,
          total: attempt.total,
          questions: formationQuestions,
        };
      }

      return {
        id: e.id,
        formationTitle: formation?.title ?? "—",
        steps: formationSteps as StepDetail[],
        completedStepIds: completedIds,
        textAnswers,
        submissions,
        quizAttempt,
      };
    });

    setSelected({ profile: member, enrollments: enrollmentDetails });
    setLoadingDetail(false);
  };

  if (!isPresidence && !isResponsable) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Accès réservé aux responsables et à la présidence.
      </div>
    );
  }

  /* ── Vue détail membre ── */
  if (selected) {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ChevronLeft size={14} />
          Retour
        </button>

        <div className="mb-6">
          <h2 className="text-xl font-bold text-foreground">{selected.profile.full_name}</h2>
          <p className="text-sm text-muted-foreground">
            {poleLabel(selected.profile.pole)} ·{" "}
            {ROLE_LABELS[selected.profile.role] ?? selected.profile.role}
          </p>
        </div>

        {loadingDetail ? (
          <div className="text-center py-12 text-muted-foreground">Chargement…</div>
        ) : selected.enrollments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-white border border-gray-200 rounded-2xl">
            <p className="text-sm">Ce membre n'est inscrit à aucune formation.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {selected.enrollments.map((enrollment) => {
              const completed = enrollment.completedStepIds.size;
              const total = enrollment.steps.length;
              return (
                <div key={enrollment.id} className="bg-white border border-gray-200 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-foreground text-sm">
                      {enrollment.formationTitle}
                    </h3>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">
                      {completed}/{total} étapes
                    </span>
                  </div>
                  {total > 0 && (
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mb-4">
                      <div
                        className="bg-black rounded-full h-1.5 transition-all"
                        style={{ width: `${(completed / total) * 100}%` }}
                      />
                    </div>
                  )}
                  {enrollment.quizAttempt && (
                    <div className="mb-3">
                      <button
                        onClick={() => toggleQuizDetail(enrollment.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-100 rounded-xl hover:bg-green-100 transition-colors"
                      >
                        <Trophy size={13} className="text-green-600 shrink-0" />
                        <span className="text-xs text-green-700 font-medium flex-1 text-left">
                          Quiz : {enrollment.quizAttempt.score}/{enrollment.quizAttempt.total}
                        </span>
                        {expandedQuizIds.has(enrollment.id)
                          ? <ChevronUp size={13} className="text-green-600 shrink-0" />
                          : <ChevronDown size={13} className="text-green-600 shrink-0" />
                        }
                      </button>
                      {expandedQuizIds.has(enrollment.id) && enrollment.quizAttempt.questions.length > 0 && (
                        <div className="mt-2 space-y-3 px-1">
                          {enrollment.quizAttempt.questions.map((q, qi) => {
                            const selected_choice = q.selectedChoiceId;
                            const correct_choice = q.choices.find((c) => c.is_correct);
                            const was_correct = selected_choice && correct_choice?.id === selected_choice;
                            return (
                              <div key={qi} className="bg-gray-50 rounded-xl p-3">
                                <p className="text-xs font-medium text-foreground mb-2">
                                  {qi + 1}. {q.question}
                                </p>
                                <div className="space-y-1">
                                  {q.choices.map((c) => {
                                    const isSelected = c.id === selected_choice;
                                    const isCorrect = c.is_correct;
                                    let cls = "text-muted-foreground";
                                    let dot = "bg-gray-200";
                                    if (isSelected && isCorrect) {
                                      cls = "text-green-700 font-medium";
                                      dot = "bg-green-500";
                                    } else if (isSelected && !isCorrect) {
                                      cls = "text-red-600 font-medium";
                                      dot = "bg-red-400";
                                    } else if (!isSelected && isCorrect && !was_correct) {
                                      cls = "text-gray-500";
                                      dot = "bg-gray-400";
                                    }
                                    return (
                                      <div key={c.id} className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                                        <span className={`text-xs ${cls}`}>
                                          {c.label}
                                          {!isSelected && isCorrect && !was_correct && (
                                            <span className="ml-1 text-[10px] text-gray-400">(bonne réponse)</span>
                                          )}
                                        </span>
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
                  )}
                  <div className="space-y-2">
                    {enrollment.steps.map((step) => {
                      const isDone = enrollment.completedStepIds.has(step.id);
                      const answer = enrollment.textAnswers[step.id];
                      return (
                        <div key={step.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                                isDone
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-muted-foreground"
                              }`}
                            >
                              {isDone ? (
                                <Check size={11} />
                              ) : (
                                <span className="text-[10px] font-bold">
                                  {step.order_index + 1}
                                </span>
                              )}
                            </div>
                            <span
                              className={`text-sm ${
                                isDone ? "text-foreground" : "text-muted-foreground"
                              }`}
                            >
                              {step.title}
                            </span>
                          </div>
                          {answer && (
                            <div className="ml-7 mt-1 px-3 py-2 bg-gray-50 rounded-lg text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">Réponse :</span>{" "}
                              {answer}
                            </div>
                          )}
                          {enrollment.submissions[step.id]?.length > 0 && (
                            <div className="ml-7 mt-1 space-y-1 overflow-hidden">
                              {enrollment.submissions[step.id].map((sub) => (
                                <button
                                  key={sub.id}
                                  onClick={() => handleDownload(sub.storage_path, sub.file_name)}
                                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700 hover:bg-blue-100 transition-colors w-full text-left min-w-0"
                                >
                                  <FileText size={11} className="shrink-0" />
                                  <span className="flex-1 truncate">{sub.file_name}</span>
                                  <Download size={11} className="shrink-0" />
                                </button>
                              ))}
                            </div>
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
    );
  }

  /* ── Vue liste membres ── */
  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground mb-1">Supervision</h2>
        <p className="text-sm text-muted-foreground">
          {isResponsable
            ? `Membres du pôle ${poleLabel(profile!.pole)}.`
            : "Vue d'ensemble de tous les membres."}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Chargement…</div>
      ) : members.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-white border border-gray-200 rounded-2xl">
          <p className="text-sm">Aucun membre trouvé.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member) => {
            const memberSummaries = summaries[member.id] ?? [];
            return (
              <div
                key={member.id}
                onClick={() => handleSelectMember(member)}
                className="bg-white border border-gray-200 rounded-2xl p-5 cursor-pointer hover:border-gray-300 transition-colors flex flex-col gap-3"
              >
                <div>
                  <p className="font-semibold text-foreground text-sm">{member.full_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {poleLabel(member.pole)} ·{" "}
                    {ROLE_LABELS[member.role] ?? member.role}
                  </p>
                </div>

                {memberSummaries.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {memberSummaries.map((s, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground truncate mr-2">
                            {s.formationTitle}
                          </span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {s.completedSteps}/{s.totalSteps}
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1">
                          <div
                            className="bg-black rounded-full h-1 transition-all"
                            style={{
                              width: `${
                                s.totalSteps > 0
                                  ? (s.completedSteps / s.totalSteps) * 100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Aucune formation suivie</p>
                )}

                <div className="mt-auto flex justify-end">
                  <span className="text-xs font-medium text-foreground flex items-center gap-1">
                    Détail <ChevronRight size={12} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SupervisionGlobal;
