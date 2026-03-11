import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { ClipboardList, Loader2, ThumbsDown, ThumbsUp } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VoteReport {
  id: string;
  title: string;
  created_at: string;
  profiles: { full_name: string } | null;
  expenses: { amount: number }[];
  myVote: "pour" | "contre" | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

const formatTotal = (expenses: { amount: number }[]) =>
  expenses
    .reduce((s, e) => s + Number(e.amount), 0)
    .toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

// ─── Component ────────────────────────────────────────────────────────────────

const TresorerieVote = () => {
  const { profile } = useAuth();
  const [reports, setReports] = useState<VoteReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingId, setVotingId] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchReports = async () => {
    setLoading(true);

    const { data: reportsData } = await supabase
      .from("expense_reports")
      .select("id, title, created_at, profiles!member_id(full_name), expenses(amount)")
      .eq("status", "vote")
      .order("created_at", { ascending: false });

    if (!reportsData) {
      setLoading(false);
      return;
    }

    const { data: myVotes } = await supabase
      .from("expense_report_votes")
      .select("report_id, vote")
      .eq("member_id", profile!.id);

    const myVoteMap = new Map(
      (myVotes ?? []).map((v) => [v.report_id, v.vote as "pour" | "contre"])
    );

    setReports(
      reportsData.map((r) => ({
        ...r,
        profiles: r.profiles as { full_name: string } | null,
        expenses: r.expenses as { amount: number }[],
        myVote: myVoteMap.get(r.id) ?? null,
      }))
    );

    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // ── Vote ───────────────────────────────────────────────────────────────────

  const handleVote = async (reportId: string, vote: "pour" | "contre") => {
    if (!profile) return;
    setVotingId(reportId);

    await supabase.from("expense_report_votes").upsert(
      { report_id: reportId, member_id: profile.id, vote },
      { onConflict: "report_id,member_id" }
    );

    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, myVote: vote } : r))
    );

    setVotingId(null);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground mb-1">Votes en cours</h2>
        <p className="text-sm text-muted-foreground">
          Consultez les notes de frais soumises au vote et exprimez votre avis.
        </p>
      </div>

      {loading ? (
        <div className="p-8 flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <Loader2 size={16} className="animate-spin" /> Chargement…
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 flex flex-col items-center justify-center gap-2 text-center">
          <ClipboardList size={32} className="text-muted-foreground/40 mb-1" />
          <p className="text-sm font-medium text-muted-foreground">
            Aucune note de frais en cours de vote.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="bg-card border border-border rounded-2xl p-5"
            >
              {/* Report info */}
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <p className="text-sm font-semibold text-foreground">{report.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {report.profiles?.full_name ?? "Membre inconnu"} ·{" "}
                    {formatDate(report.created_at)} · {formatTotal(report.expenses)}
                  </p>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400 shrink-0">
                  En vote
                </span>
              </div>

              {/* Vote buttons */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">
                  Votre vote
                </span>

                <button
                  onClick={() => handleVote(report.id, "pour")}
                  disabled={votingId === report.id}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                    report.myVote === "pour"
                      ? "bg-green-100 border-green-300 text-green-700 dark:bg-green-500/20 dark:border-green-500/40 dark:text-green-400 ring-2 ring-green-300/50 dark:ring-green-500/20"
                      : "border-border text-muted-foreground hover:border-green-400 hover:text-green-600 dark:hover:border-green-500/40 dark:hover:text-green-400"
                  } disabled:opacity-50`}
                >
                  <ThumbsUp size={14} />
                  Pour
                </button>

                <button
                  onClick={() => handleVote(report.id, "contre")}
                  disabled={votingId === report.id}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                    report.myVote === "contre"
                      ? "bg-red-100 border-red-300 text-red-700 dark:bg-red-500/20 dark:border-red-500/40 dark:text-red-400 ring-2 ring-red-300/50 dark:ring-red-500/20"
                      : "border-border text-muted-foreground hover:border-red-400 hover:text-red-600 dark:hover:border-red-500/40 dark:hover:text-red-400"
                  } disabled:opacity-50`}
                >
                  <ThumbsDown size={14} />
                  Contre
                </button>

                {votingId === report.id && (
                  <Loader2 size={14} className="animate-spin text-muted-foreground" />
                )}

                {report.myVote && votingId !== report.id && (
                  <span className="text-xs text-muted-foreground">
                    Vote enregistré
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TresorerieVote;
