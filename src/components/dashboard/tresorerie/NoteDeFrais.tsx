import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import {
  Plus,
  X,
  ChevronDown,
  ChevronRight,
  Loader2,
  Download,
  Paperclip,
  Receipt,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

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

interface ExpenseReport {
  id: string;
  member_id: string;
  title: string;
  status: "en_attente" | "vote" | "approuvee" | "refusee" | "payee";
  created_at: string;
  expenses: Expense[];
}

interface ExpenseForm {
  title: string;
  date: string;
  description: string;
  amount: string;
  receiptFile: File | null;
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<
  ExpenseReport["status"],
  { label: string; className: string }
> = {
  en_attente: { label: "En attente", className: "status-en-cours" },
  vote: {
    label: "En vote",
    className: "bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400",
  },
  approuvee: { label: "Approuvée", className: "status-termine" },
  refusee: {
    label: "Refusée",
    className:
      "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  },
  payee: {
    label: "Payée",
    className:
      "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
  },
};

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

const emptyExpenseForm = (): ExpenseForm => ({
  title: "",
  date: new Date().toISOString().slice(0, 10),
  description: "",
  amount: "",
  receiptFile: null,
});

// ─── Component ────────────────────────────────────────────────────────────────

const NoteDeFrais = () => {
  const { user } = useAuth();

  const [reports, setReports] = useState<ExpenseReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Create form
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newExpenses, setNewExpenses] = useState<ExpenseForm[]>([emptyExpenseForm()]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Receipt download loading per expense id
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // File input refs per expense row index
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchReports = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("expense_reports")
      .select("*, expenses(*)")
      .eq("member_id", user.id)
      .order("created_at", { ascending: false });

    setReports((data as ExpenseReport[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ── Expand toggle ──────────────────────────────────────────────────────────

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Expense form helpers ───────────────────────────────────────────────────

  const updateExpense = (index: number, patch: Partial<ExpenseForm>) => {
    setNewExpenses((prev) =>
      prev.map((e, i) => (i === index ? { ...e, ...patch } : e))
    );
  };

  const addExpenseRow = () => {
    setNewExpenses((prev) => [...prev, emptyExpenseForm()]);
  };

  const removeExpenseRow = (index: number) => {
    setNewExpenses((prev) => prev.filter((_, i) => i !== index));
  };

  const cancelCreate = () => {
    setCreating(false);
    setNewTitle("");
    setNewExpenses([emptyExpenseForm()]);
    setFormError(null);
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!user) return;
    setFormError(null);

    if (!newTitle.trim()) {
      setFormError("Le titre de la note est requis.");
      return;
    }
    if (newExpenses.length === 0) {
      setFormError("Ajoutez au moins une dépense.");
      return;
    }
    for (let i = 0; i < newExpenses.length; i++) {
      const e = newExpenses[i];
      if (!e.title.trim()) {
        setFormError(`La dépense ${i + 1} doit avoir un titre.`);
        return;
      }
      if (!e.date) {
        setFormError(`La dépense ${i + 1} doit avoir une date.`);
        return;
      }
      if (!e.amount || isNaN(parseFloat(e.amount)) || parseFloat(e.amount) <= 0) {
        setFormError(`Le montant de la dépense ${i + 1} est invalide.`);
        return;
      }
    }

    setSubmitting(true);

    // 1. Insert expense_report
    const { data: reportData, error: reportError } = await supabase
      .from("expense_reports")
      .insert({ member_id: user.id, title: newTitle.trim(), status: "en_attente" })
      .select()
      .single();

    if (reportError || !reportData) {
      setFormError(reportError?.message ?? "Erreur lors de la création de la note.");
      setSubmitting(false);
      return;
    }

    const reportId = reportData.id as string;
    const insertedExpenses: Expense[] = [];

    // 2. For each expense: upload receipt if present, then insert expense
    for (const exp of newExpenses) {
      let receiptUrl: string | null = null;

      if (exp.receiptFile) {
        const path = `${user.id}/${reportId}/${Date.now()}_${exp.receiptFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("expense-receipts")
          .upload(path, exp.receiptFile);
        if (!uploadError) {
          receiptUrl = path;
        }
      }

      const { data: expData } = await supabase
        .from("expenses")
        .insert({
          report_id: reportId,
          title: exp.title.trim(),
          date: exp.date,
          description: exp.description.trim() || null,
          amount: parseFloat(exp.amount),
          receipt_url: receiptUrl,
        })
        .select()
        .single();

      if (expData) insertedExpenses.push(expData as Expense);
    }

    // 3. Update local state
    const newReport: ExpenseReport = {
      ...(reportData as Omit<ExpenseReport, "expenses">),
      expenses: insertedExpenses,
    };

    setReports((prev) => [newReport, ...prev]);
    cancelCreate();
    setSubmitting(false);
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
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground mb-1">Mes notes de frais</h2>
          <p className="text-sm text-muted-foreground">
            Soumettez vos dépenses pour remboursement. La trésorerie traitera vos demandes.
          </p>
        </div>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-foreground text-background text-sm font-semibold rounded-xl hover:bg-foreground/90 transition-colors shrink-0"
          >
            <Plus size={16} />
            Nouvelle note de frais
          </button>
        )}
      </div>

      {/* ── Create form ────────────────────────────────────────────────────── */}
      {creating && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Nouvelle note de frais</h3>
            <button
              onClick={cancelCreate}
              disabled={submitting}
              className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-6 flex flex-col gap-6">
            {/* Titre de la note */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Titre de la note
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex : Déplacement client — Paris, mars 2026"
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/40 transition"
              />
            </div>

            {/* Dépenses */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Dépenses
                </p>
                <button
                  onClick={addExpenseRow}
                  disabled={submitting}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus size={13} />
                  Ajouter une dépense
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {newExpenses.map((exp, idx) => (
                  <div
                    key={idx}
                    className="bg-muted/40 border border-border rounded-xl p-4 flex flex-col gap-3"
                  >
                    {/* Row 1: title + date + amount + remove */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="text"
                        value={exp.title}
                        onChange={(e) => updateExpense(idx, { title: e.target.value })}
                        placeholder="Titre de la dépense"
                        className="flex-1 min-w-[160px] px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/40 transition"
                      />
                      <input
                        type="date"
                        value={exp.date}
                        onChange={(e) => updateExpense(idx, { date: e.target.value })}
                        className="w-40 px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/40 transition"
                      />
                      <div className="relative w-32">
                        <input
                          type="number"
                          value={exp.amount}
                          onChange={(e) => updateExpense(idx, { amount: e.target.value })}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          className="w-full pl-3 pr-7 py-2 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/40 transition"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                          €
                        </span>
                      </div>
                      <button
                        onClick={() => removeExpenseRow(idx)}
                        disabled={submitting || newExpenses.length === 1}
                        className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-30"
                        title="Supprimer cette dépense"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {/* Row 2: description + receipt */}
                    <div className="flex items-start gap-2 flex-wrap">
                      <textarea
                        value={exp.description}
                        onChange={(e) => updateExpense(idx, { description: e.target.value })}
                        rows={2}
                        placeholder="Description (optionnel)"
                        className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/40 transition resize-none"
                      />
                      <div className="shrink-0">
                        <button
                          type="button"
                          onClick={() => fileInputRefs.current[idx]?.click()}
                          disabled={submitting}
                          className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <Paperclip size={13} />
                          {exp.receiptFile ? (
                            <span className="max-w-[140px] truncate text-foreground">
                              {exp.receiptFile.name}
                            </span>
                          ) : (
                            "Justificatif"
                          )}
                        </button>
                        <input
                          ref={(el) => { fileInputRefs.current[idx] = el; }}
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null;
                            updateExpense(idx, { receiptFile: file });
                            e.target.value = "";
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Error */}
            {formError && (
              <p className="text-xs text-red-600 dark:text-red-400">{formError}</p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleCreate}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 bg-foreground text-background text-sm font-semibold rounded-xl hover:bg-foreground/90 transition-colors disabled:opacity-40"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                Créer la note
              </button>
              <button
                onClick={cancelCreate}
                disabled={submitting}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground border border-transparent hover:border-border rounded-xl transition-colors disabled:opacity-40"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Report list ────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="p-8 flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <Loader2 size={16} className="animate-spin" /> Chargement…
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 flex flex-col items-center justify-center gap-2 text-center">
          <Receipt size={32} className="text-muted-foreground/40 mb-1" />
          <p className="text-sm font-medium text-muted-foreground">
            Aucune note de frais pour le moment.
          </p>
          <p className="text-xs text-muted-foreground/70">
            Cliquez sur « Nouvelle note de frais » pour soumettre vos dépenses.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {reports.map((report) => {
            const isOpen = expanded.has(report.id);
            const status = STATUS_LABELS[report.status];
            const total = sumExpenses(report.expenses);

            return (
              <div
                key={report.id}
                className="bg-card border border-border rounded-2xl overflow-hidden"
              >
                {/* Card header — click to expand */}
                <button
                  onClick={() => toggleExpand(report.id)}
                  className="w-full text-left px-5 py-4 flex items-center gap-3 hover:bg-muted/30 transition-colors"
                >
                  {isOpen ? (
                    <ChevronDown size={16} className="text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight size={16} className="text-muted-foreground shrink-0" />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {report.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
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

                {/* Expanded expenses */}
                {isOpen && (
                  <div className="border-t border-border px-5 py-4">
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
                                {exp.description ?? <span className="italic opacity-50">—</span>}
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
                                  <span className="text-xs text-muted-foreground italic">—</span>
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
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NoteDeFrais;
