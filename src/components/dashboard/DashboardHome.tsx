import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  Mail,
  Search,
  BarChart2,
  ArrowRight,
  Megaphone,
  Plus,
  Trash2,
  Bell,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { PoleType } from "@/lib/db-types";

// ─── Types ───────────────────────────────────────────────────────────────────

type Announcement = {
  id: string;
  title: string;
  content: string | null;
  created_at: string;
};

type QuickCard = {
  icon: LucideIcon;
  label: string;
  desc: string;
  color: string;
  action: () => void;
};

// ─── Animation variants ───────────────────────────────────────────────────────

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const POLE_LABELS: Record<PoleType, string> = {
  secretariat: "Secrétariat",
  tresorerie: "Trésorerie",
  rh_event: "RH & Événements",
  communication: "Communication",
  etude: "Étude",
  qualite: "Qualité",
  presidence: "Présidence",
};

const ROLE_LABELS: Record<string, string> = {
  normal: "Membre",
  responsable: "Responsable",
  presidence: "Présidence",
};

function buildQuickCards(
  role: string | undefined,
  pole: string | undefined,
  setActiveView: (v: string) => void
): QuickCard[] {
  const cards: QuickCard[] = [];

  cards.push({
    icon: BookOpen,
    label: "Formations",
    desc: "Gérer les formations",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    action: () => setActiveView(`formations/${pole}`),
  });

  if (
    pole && ["presidence", "etude", "qualite"].includes(pole) ||
    role === "presidence"
  ) {
    cards.push({
      icon: Search,
      label: "Études",
      desc: "Générer des études",
      color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      action: () => setActiveView("etudes/generer"),
    });
  }

  if (role === "presidence") {
    cards.push({
      icon: Mail,
      label: "Mails",
      desc: "Générer des mails IA",
      color: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
      action: () => setActiveView("mails/compose"),
    });
  }

  if (role === "presidence" || role === "responsable") {
    cards.push({
      icon: BarChart2,
      label: "Supervision",
      desc: "Vue globale",
      color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      action: () => setActiveView("supervision"),
    });
  }

  return cards;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  setActiveView: (view: string) => void;
}

export default function DashboardHome({ setActiveView }: Props) {
  const { profile } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isPresidence = profile?.role === "presidence";
  const firstName = profile?.full_name?.split(" ")[0] ?? "...";
  const todayRaw = format(new Date(), "EEEE d MMMM yyyy", { locale: fr });
  const today = todayRaw.charAt(0).toUpperCase() + todayRaw.slice(1);

  const quickCards = buildQuickCards(profile?.role, profile?.pole, setActiveView);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoadingNews(true);
    const { data } = await supabase
      .from("announcements")
      .select("id, title, content, created_at")
      .order("created_at", { ascending: false })
      .limit(6);
    setAnnouncements(data ?? []);
    setLoadingNews(false);
  };

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    setSubmitting(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("announcements").insert({
      title: newTitle.trim(),
      content: newContent.trim() || null,
      author_id: user?.id,
    });
    setNewTitle("");
    setNewContent("");
    setShowForm(false);
    setSubmitting(false);
    fetchAnnouncements();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("announcements").delete().eq("id", id);
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* ── Banner ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="rounded-2xl px-8 py-10"
        style={{ background: "var(--gradient-hero)" }}
      >
        <p className="text-xs font-medium text-muted-foreground mb-3 tracking-wide uppercase">
          {today}
        </p>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Bonjour, {firstName} 👋
        </h1>
        <p className="text-sm text-muted-foreground">
          Pôle{" "}
          <span className="font-semibold text-foreground">
            {POLE_LABELS[profile?.pole as PoleType] ?? profile?.pole}
          </span>
          &nbsp;·&nbsp; Rôle{" "}
          <span className="font-semibold text-foreground">
            {ROLE_LABELS[profile?.role ?? ""] ?? profile?.role}
          </span>
        </p>
      </motion.div>

      {/* ── Quick access ── */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
          Accès rapide
        </p>
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          {quickCards.map((card) => (
            <motion.button
              key={card.label}
              variants={fadeUp}
              whileHover={{ y: -3, transition: { duration: 0.15 } }}
              whileTap={{ scale: 0.97 }}
              onClick={card.action}
              className="group flex flex-col items-start gap-3 p-5 bg-card border border-border rounded-xl hover:border-border/60 hover:shadow-md transition-all text-left"
            >
              <div className={`p-2.5 rounded-lg ${card.color}`}>
                <card.icon size={18} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-foreground">
                  {card.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {card.desc}
                </p>
              </div>
              <ArrowRight
                size={14}
                className="text-muted-foreground group-hover:translate-x-1 transition-transform"
              />
            </motion.button>
          ))}
        </motion.div>
      </div>

      {/* ── Announcements ── */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Actualités CAPISEN
          </p>
          {isPresidence && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowForm(!showForm)}
              className="gap-1.5 h-8 text-xs"
            >
              <Plus size={13} />
              Publier
            </Button>
          )}
        </div>

        {/* Publication form */}
        {isPresidence && showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-card border border-border rounded-xl p-5 mb-4 space-y-3 overflow-hidden"
          >
            <input
              className="w-full text-sm px-3 py-2 border border-border rounded-lg bg-muted focus:bg-background focus:outline-none focus:ring-2 focus:ring-foreground/10 font-medium placeholder:text-muted-foreground transition-colors text-foreground"
              placeholder="Titre de l'actualité..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <textarea
              className="w-full text-sm px-3 py-2 border border-border rounded-lg bg-muted focus:bg-background focus:outline-none focus:ring-2 focus:ring-foreground/10 resize-none placeholder:text-muted-foreground transition-colors text-foreground"
              rows={2}
              placeholder="Description (optionnel)..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowForm(false)}
                className="h-8 text-xs"
              >
                Annuler
              </Button>
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={submitting || !newTitle.trim()}
                className="h-8 text-xs"
              >
                {submitting ? "Publication..." : "Publier"}
              </Button>
            </div>
          </motion.div>
        )}

        {/* News list */}
        <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
          {loadingNews ? (
            <div className="p-6 space-y-4">
              {[80, 60, 70].map((w, i) => (
                <div
                  key={i}
                  className="h-4 bg-muted rounded-full animate-pulse"
                  style={{ width: `${w}%` }}
                />
              ))}
            </div>
          ) : announcements.length === 0 ? (
            <div className="py-12 text-center">
              <Bell size={28} className="mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                Aucune actualité pour le moment.
              </p>
              {isPresidence && (
                <p className="text-xs text-muted-foreground mt-1">
                  Publiez la première via le bouton ci-dessus.
                </p>
              )}
            </div>
          ) : (
            announcements.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="group flex items-start gap-3 px-5 py-4 hover:bg-muted/40 transition-colors"
              >
                <div className="mt-0.5 p-1.5 rounded-md bg-muted text-muted-foreground flex-shrink-0">
                  <Megaphone size={13} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {a.title}
                  </p>
                  {a.content && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {a.content}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(a.created_at), "d MMM yyyy", { locale: fr })}
                  </p>
                </div>
                {isPresidence && (
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-red-500/10 hover:text-red-500 text-muted-foreground transition-all flex-shrink-0"
                    title="Supprimer"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}
