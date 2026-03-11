import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ChevronDown, ChevronRight, Download, Loader2, ClipboardList, Trash2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Expense {
  id: string;
  report_id: string;
  title: string;
  date: string;
  description: string | null;
  amount: number;
  receipt_url: string | null;
  created_at: string;
}

interface MemberProfile {
  full_name: string;
  pole: string;
}

type ReportStatus = "en_attente" | "vote" | "approuvee" | "refusee" | "payee";

interface ExpenseReport {
  id: string;
  member_id: string;
  title: string;
  status: ReportStatus;
  created_at: string;
  expenses: Expense[];
  profiles: MemberProfile | null;
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<ReportStatus, { label: string; className: string }> = {
  en_attente: { label: "En attente", className: "status-en-cours" },
  vote: {
    label: "En vote",
    className: "bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400",
  },
  approuvee: { label: "Approuvée", className: "status-termine" },
  refusee: {
    label: "Refusée",
    className: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  },
  payee: {
    label: "Payée",
    className: "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
  },
};

const ALL_STATUSES: ReportStatus[] = ["en_attente", "vote", "approuvee", "refusee", "payee"];

// ─── Filter tab definition ─────────────────────────────────────────────────────

type FilterTab = "all" | ReportStatus;

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "Toutes" },
  { key: "en_attente", label: "En attente" },
  { key: "vote", label: "En vote" },
  { key: "approuvee", label: "Approuvées" },
  { key: "refusee", label: "Refusées" },
  { key: "payee", label: "Payées" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

const formatAmount = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

const sumExpenses = (expenses: Expense[]) =>
  expenses.reduce((acc, e) => acc + Number(e.amount), 0);

// ─── Component ────────────────────────────────────────────────────────────────

const TresorerieGestion = () => {
  const [reports, setReports] = useState<ExpenseReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  // Per-report pending status change
  const [editStatus, setEditStatus] = useState<Record<string, ReportStatus>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [voteCounts, setVoteCounts] = useState<Record<string, { pour: number; contre: number }>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchReports = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("expense_reports")
      .select("*, expenses(*), profiles!member_id(full_name, pole)")
      .order("created_at", { ascending: false });

    setReports((data as ExpenseReport[]) ?? []);

    const { data: votes } = await supabase
      .from("expense_report_votes")
      .select("report_id, vote");

    const counts: Record<string, { pour: number; contre: number }> = {};
    for (const v of votes ?? []) {
      if (!counts[v.report_id]) counts[v.report_id] = { pour: 0, contre: 0 };
      if (v.vote === "pour") counts[v.report_id].pour++;
      else if (v.vote === "contre") counts[v.report_id].contre++;
    }
    setVoteCounts(counts);

    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // ── Derived counts ─────────────────────────────────────────────────────────

  const countByStatus = (status: ReportStatus) =>
    reports.filter((r) => r.status === status).length;

  const filteredReports =
    activeTab === "all" ? reports : reports.filter((r) => r.status === activeTab);

  // ── Expand toggle ──────────────────────────────────────────────────────────

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Status save ───────────────────────────────────────────────────────────

  const handleStatusSave = async (reportId: string) => {
    const newStatus = editStatus[reportId];
    if (!newStatus) return;

    setSavingId(reportId);

    const { error } = await supabase
      .from("expense_reports")
      .update({ status: newStatus })
      .eq("id", reportId);

    if (!error) {
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r))
      );
      setEditStatus((prev) => {
        const next = { ...prev };
        delete next[reportId];
        return next;
      });
    }

    setSavingId(null);
  };

  // ── Delete report ──────────────────────────────────────────────────────────

  const handleDelete = async (report: ExpenseReport) => {
    setDeletingId(report.id);

    const paths = report.expenses
      .map((e) => e.receipt_url)
      .filter((p): p is string => !!p);
    if (paths.length > 0) {
      await supabase.storage.from("expense-receipts").remove(paths);
    }

    await supabase.from("expense_reports").delete().eq("id", report.id);

    setReports((prev) => prev.filter((r) => r.id !== report.id));
    setConfirmDeleteId(null);
    setDeletingId(null);
  };

  // ── Receipt download ───────────────────────────────────────────────────────

  const handleDownloadReceipt = async (expense: Expense) => {
    if (!expense.receipt_url) return;
    setDownloadingId(expense.id);

    const { data, error } = await supabase.storage
      .from("expense-receipts")
      .createSignedUrl(expense.receipt_url, 3600);

    if (!error && data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    }
    setDownloadingId(null);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground mb-1">
          Gestion des notes de frais
        </h2>
        <p className="text-sm text-muted-foreground">
          Consultez, validez et payez les notes de frais de tous les membres.
        </p>
      </div>

      {/* ── Filter tabs ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 mb-6 bg-muted/50 p-1 rounded-xl w-fit flex-wrap">
        {FILTER_TABS.map((tab) => {
          const count =
            tab.key === "all" ? reports.length : countByStatus(tab.key as ReportStatus);
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  isActive
                    ? "bg-foreground/10 text-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Report list ────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="p-8 flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <Loader2 size={16} className="animate-spin" /> Chargement…
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 flex flex-col items-center justify-center gap-2 text-center">
          <ClipboardList size={32} className="text-muted-foreground/40 mb-1" />
          <p className="text-sm font-medium text-muted-foreground">
            {activeTab === "all"
              ? "Aucune note de frais soumise pour le moment."
              : `Aucune note de frais avec le statut « ${STATUS_LABELS[activeTab as ReportStatus]?.label} ».`}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredReports.map((report) => {
            const isOpen = expanded.has(report.id);
            const status = STATUS_LABELS[report.status];
            const total = sumExpenses(report.expenses);
            const pendingStatus = editStatus[report.id];
            const hasChange = pendingStatus !== undefined && pendingStatus !== report.status;

            return (
              <div
                key={report.id}
                className="bg-card border border-border rounded-2xl overflow-hidden"
              >
                {/* Card header */}
                <div className="flex items-center">
                  <button
                    onClick={() => toggleExpand(report.id)}
                    className="flex-1 text-left px-5 py-4 flex items-center gap-3 hover:bg-muted/30 transition-colors min-w-0"
                  >
                    {isOpen ? (
                      <ChevronDown size={16} className="text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight size={16} className="text-muted-foreground shrink-0" />
                    )}

                    {/* Member avatar placeholder */}
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-muted-foreground uppercase">
                        {report.profiles?.full_name?.charAt(0) ?? "?"}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {report.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {report.profiles?.full_name ?? "Membre inconnu"} ·{" "}
                        {formatDate(report.created_at)} · {report.expenses.length} dépense
                        {report.expenses.length !== 1 ? "s" : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-semibold text-foreground">
                        {formatAmount(total)}
                      </span>
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </div>
                  </button>

                  {/* Delete zone */}
                  <div className="pr-4 shrink-0 flex items-center gap-2">
                    {confirmDeleteId === report.id ? (
                      <>
                        <span className="text-xs text-muted-foreground">Confirmer ?</span>
                        <button
                          onClick={() => handleDelete(report)}
                          disabled={deletingId === report.id}
                          className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
                        >
                          {deletingId === report.id ? <Loader2 size={12} className="animate-spin" /> : "Oui"}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          disabled={deletingId === report.id}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Annuler
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(report.id)}
                        className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                        title="Supprimer cette note"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded content */}
                {isOpen && (
                  <div className="border-t border-border">
                    {/* Expenses list */}
                    <div className="px-5 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                        Détail des dépenses
                      </p>

                      {report.expenses.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Aucune dépense enregistrée.
                        </p>
                      ) : (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left">
                              <th className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground pb-3 pr-4">
                                Titre
                              </th>
                              <th className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground pb-3 pr-4">
                                Date
                              </th>
                              <th className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground pb-3 pr-4">
                                Montant
                              </th>
                              <th className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground pb-3 pr-4">
                                Description
                              </th>
                              <th className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground pb-3 text-right">
                                Justificatif
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {report.expenses.map((exp) => (
                              <tr key={exp.id}>
                                <td className="py-2.5 pr-4 font-medium text-foreground">
                                  {exp.title}
                                </td>
                                <td className="py-2.5 pr-4 text-muted-foreground whitespace-nowrap">
                                  {new Date(exp.date).toLocaleDateString("fr-FR")}
                                </td>
                                <td className="py-2.5 pr-4 text-foreground font-semibold whitespace-nowrap">
                                  {formatAmount(Number(exp.amount))}
                                </td>
                                <td className="py-2.5 pr-4 text-muted-foreground text-xs max-w-[200px]">
                                  {exp.description ?? (
                                    <span className="italic opacity-50">—</span>
                                  )}
                                </td>
                                <td className="py-2.5 text-right">
                                  {exp.receipt_url ? (
                                    <button
                                      onClick={() => handleDownloadReceipt(exp)}
                                      disabled={downloadingId === exp.id}
                                      className="btn-sm-outline"
                                    >
                                      {downloadingId === exp.id ? (
                                        <Loader2 size={12} className="animate-spin" />
                                      ) : (
                                        <Download size={12} />
                                      )}
                                      Voir
                                    </button>
                                  ) : (
                                    <span className="text-xs text-muted-foreground italic">
                                      —
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-border">
                              <td
                                colSpan={2}
                                className="pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                              >
                                Total
                              </td>
                              <td className="pt-3 font-bold text-foreground whitespace-nowrap">
                                {formatAmount(total)}
                              </td>
                              <td colSpan={2} />
                            </tr>
                          </tfoot>
                        </table>
                      )}
                    </div>

                    {/* Vote results (visible dès qu'un vote a eu lieu, même après changement de statut) */}
                    {((voteCounts[report.id]?.pour ?? 0) + (voteCounts[report.id]?.contre ?? 0)) > 0 && (
                      <div className="px-5 py-4 border-t border-border bg-violet-50/50 dark:bg-violet-500/5 flex items-center gap-6">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Résultats du vote
                        </p>
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1.5 text-sm font-semibold text-green-700 dark:text-green-400">
                            <span className="w-2 h-2 rounded-full bg-green-500 dark:bg-green-400" />
                            Pour : {voteCounts[report.id]?.pour ?? 0}
                          </span>
                          <span className="flex items-center gap-1.5 text-sm font-semibold text-red-700 dark:text-red-400">
                            <span className="w-2 h-2 rounded-full bg-red-500 dark:bg-red-400" />
                            Contre : {voteCounts[report.id]?.contre ?? 0}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({(voteCounts[report.id]?.pour ?? 0) + (voteCounts[report.id]?.contre ?? 0)} vote{((voteCounts[report.id]?.pour ?? 0) + (voteCounts[report.id]?.contre ?? 0)) !== 1 ? "s" : ""})
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Status management */}
                    <div className="px-5 py-4 border-t border-border bg-muted/20 flex items-center gap-4 flex-wrap">
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Changer le statut
                        </label>
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                          {ALL_STATUSES.map((s) => {
                            const cfg = STATUS_LABELS[s];
                            const isCurrent = report.status === s;
                            const isSelected =
                              (pendingStatus ?? report.status) === s;
                            return (
                              <button
                                key={s}
                                onClick={() =>
                                  setEditStatus((prev) => ({
                                    ...prev,
                                    [report.id]: s,
                                  }))
                                }
                                disabled={savingId === report.id}
                                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                                  isSelected
                                    ? `${cfg.className} border-transparent ring-2 ring-offset-1 ring-foreground/20`
                                    : isCurrent
                                    ? `${cfg.className} border-transparent opacity-70`
                                    : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                                }`}
                              >
                                {cfg.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {hasChange && (
                        <button
                          onClick={() => handleStatusSave(report.id)}
                          disabled={savingId === report.id}
                          className="flex items-center gap-2 px-4 py-2 bg-foreground text-background text-sm font-semibold rounded-xl hover:bg-foreground/90 transition-colors disabled:opacity-40 mt-auto"
                        >
                          {savingId === report.id && (
                            <Loader2 size={14} className="animate-spin" />
                          )}
                          Enregistrer
                        </button>
                      )}
                    </div>
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

export default TresorerieGestion;
