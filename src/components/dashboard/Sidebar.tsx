import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Mail, ChevronDown,
  Lock, Wand2, Users, FileText, Package, History,
  BarChart3, FolderOpen, FilePlus, Building2, X, LogOut,
  Sun, Moon, LayoutTemplate, Briefcase, UserPlus, List, ClipboardList,
  Wallet, ReceiptText, Settings2, Scale, FlaskConical, AlertTriangle,
} from "lucide-react";
import { useTheme } from "next-themes";
import type { UserProfile } from "@/contexts/AuthContext";
import { POLE_OPTIONS } from "@/lib/db-types";
import { canAccess } from "@/lib/permissions";
import logo from "@/assets/logo-capisen.png";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  locked?: boolean;
}

interface MenuItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  children?: SubItem[];
  comingSoon?: boolean;
  hidden?: boolean;
}

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  profile: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onSignOut: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  apprenti:    "Apprenti",
  normal:      "Membre",
  responsable: "Responsable",
  presidence:  "Présidence",
};

// ─── Component ────────────────────────────────────────────────────────────────

const Sidebar = ({
  activeView,
  setActiveView,
  profile,
  isOpen,
  onClose,
  onSignOut,
}: SidebarProps) => {
  const [openMenus, setOpenMenus] = useState<Set<string>>(new Set());
  const { resolvedTheme, setTheme } = useTheme();

  const toggleMenu = (key: string) => {
    setOpenMenus((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isPresidence = profile?.role === "presidence";
  const userPole = profile?.pole;
  const isNouveauMembre = userPole === "nouveau";
  const isIntervenant = userPole === "intervenant";

  const visiblePoles = isPresidence
    ? POLE_OPTIONS.filter((p) => p.value !== "nouveau" && p.value !== "intervenant")
    : POLE_OPTIONS.filter((p: (typeof POLE_OPTIONS)[number]) => p.value === userPole && p.value !== "nouveau");

  const formationsSubItems: SubItem[] = visiblePoles.map((p) => ({
    key: `formations/${p.value}`,
    label: p.label,
    icon: <Building2 size={14} />,
  }));

  const mailsVisible       = canAccess(profile, "mails");
  const supervisionVisible = canAccess(profile, "supervision");
  const etudesVisible      = canAccess(profile, "etudes");
  const clientsVisible     = canAccess(profile, "clients");
  const isTresorerie       = userPole === "tresorerie";
  const isSecretariat      = userPole === "secretariat";
  const canManageNDF       = isTresorerie || isPresidence || isSecretariat;
  // Note de frais : tous les vrais membres (pas intervenant, pas nouveau)
  const canSeeNDF          = !isIntervenant && !isNouveauMembre;

  const menuItems: MenuItem[] = [
    // ── Espace intervenant ──────────────────────────────────────────────────────
    {
      key: "intervenant/missions",
      label: "Mes missions",
      icon: <ClipboardList size={16} />,
      hidden: !isIntervenant,
    },
    // ── Espace membres ──────────────────────────────────────────────────────────
    {
      key: "formations",
      label: "Formations",
      icon: <BookOpen size={16} />,
      hidden: isNouveauMembre,
      children: formationsSubItems,
    },
    {
      key: "supervision",
      label: "Supervision",
      icon: <BarChart3 size={16} />,
      hidden: !supervisionVisible || isNouveauMembre || isIntervenant,
    },
    {
      key: "mails",
      label: "Mails",
      icon: <Mail size={16} />,
      hidden: !mailsVisible || isNouveauMembre || isIntervenant,
      children: [
        { key: "mails/compose",   label: "Rédaction IA", icon: <Wand2 size={14} /> },
        { key: "mails/contacts",  label: "Contacts",     icon: <Users size={14} /> },
        { key: "mails/templates", label: "Templates",    icon: <FileText size={14} /> },
        { key: "mails/offres",    label: "Offres",       icon: <Package size={14} /> },
        { key: "mails/history",   label: "Historique",   icon: <History size={14} /> },
      ],
    },
    {
      key: "etudes",
      label: "Études",
      icon: <FolderOpen size={16} />,
      hidden: !etudesVisible || isNouveauMembre || isIntervenant,
      children: [
        { key: "etudes/missions",   label: "Missions",   icon: <ClipboardList size={14} /> },
        { key: "etudes/generer",    label: "Générer",    icon: <FilePlus size={14} /> },
        { key: "etudes/docs-types", label: "Docs Types", icon: <LayoutTemplate size={14} /> },
        { key: "etudes/historique", label: "Historique", icon: <History size={14} /> },
      ],
    },
    {
      key: "clients",
      label: "Clients",
      icon: <Briefcase size={16} />,
      hidden: !clientsVisible || isNouveauMembre || isIntervenant,
      children: [
        { key: "clients/liste",   label: "Liste clients",    icon: <List size={14} /> },
        { key: "clients/inviter", label: "Inviter un client", icon: <UserPlus size={14} /> },
        { key: "clients/projets", label: "Projets",           icon: <FolderOpen size={14} /> },
      ],
    },
    {
      key: "training",
      label: "Simulations",
      icon: <FlaskConical size={16} />,
      hidden: isNouveauMembre || isIntervenant,
      children: [
        { key: "training/simulation", label: "Étude blanche",     icon: <FlaskConical size={14} /> },
        { key: "training/scenario",   label: "Scénario critique", icon: <AlertTriangle size={14} /> },
      ],
    },
    {
      key: "tresorerie",
      label: "Trésorerie",
      icon: <Wallet size={16} />,
      hidden: !canSeeNDF,
      children: [
        { key: "tresorerie/notes",   label: "Note de frais",        icon: <ReceiptText size={14} /> },
        { key: "tresorerie/vote",    label: "Vote",                  icon: <Scale size={14} /> },
        ...(canManageNDF ? [{ key: "tresorerie/gestion", label: "Gérer les notes", icon: <Settings2 size={14} /> }] : []),
      ],
    },
  ];

  // ─── Styles (adaptés mode jour / mode nuit) ──────────────────────────────────

  const navBase =
    "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 text-left";
  const navActive =
    "bg-muted text-foreground font-medium dark:bg-white/[0.09] dark:text-white";
  const navInactive =
    "text-muted-foreground hover:bg-muted/60 hover:text-foreground dark:text-white/50 dark:hover:bg-white/[0.05] dark:hover:text-white/80";

  const subBase =
    "w-full flex items-center justify-between px-2.5 py-2 rounded-md text-sm transition-all duration-150 text-left";
  const subActive =
    "bg-muted text-foreground font-medium dark:bg-white/[0.09] dark:text-white";
  const subInactive =
    "text-muted-foreground/80 hover:bg-muted/60 hover:text-foreground dark:text-white/40 dark:hover:bg-white/[0.05] dark:hover:text-white/70";

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <aside
      className={`
        capisen-sidebar
        fixed lg:static inset-y-0 left-0 z-40
        w-64 flex flex-col shrink-0
        transition-transform duration-300 ease-in-out lg:translate-x-0
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-5 h-[57px] border-b border-border shrink-0">
        <button onClick={() => setActiveView("home")}>
          <img
            src={logo}
            alt="CAPISEN"
            className="h-7 w-auto"
            style={{
              filter: resolvedTheme === "dark"
                ? "brightness(0) invert(1)"
                : "brightness(0)",
            }}
          />
        </button>
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground dark:hover:bg-white/10 dark:text-white/40 dark:hover:text-white/70 transition-colors"
          aria-label="Fermer le menu"
        >
          <X size={16} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {isNouveauMembre && (
          <div className="mx-1 mt-1 mb-3 px-3 py-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Accès en attente</p>
            <p className="text-[11px] text-amber-600/80 dark:text-amber-400/70 mt-0.5 leading-snug">
              Un président doit t'attribuer un pôle pour débloquer l'accès.
            </p>
          </div>
        )}
        {menuItems.map((item) => {
          if (item.hidden) return null;

          if (item.children) {
            const isMenuOpen = openMenus.has(item.key);
            const isParentActive = activeView.startsWith(item.key);

            return (
              <div key={item.key}>
                <button
                  onClick={() => toggleMenu(item.key)}
                  className={`${navBase} justify-between ${
                    isParentActive ? navActive : navInactive
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    {item.icon}
                    {item.label}
                  </span>
                  <motion.div
                    animate={{ rotate: isMenuOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown size={13} className="opacity-50" />
                  </motion.div>
                </button>

                <AnimatePresence initial={false}>
                  {isMenuOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <div className="ml-4 pl-3 border-l border-border dark:border-white/[0.07] mt-0.5 pb-1 space-y-0.5">
                        {item.children.map((child) => {
                          const locked = child.locked ?? false;
                          const isActive = activeView === child.key;
                          return (
                            <button
                              key={child.key}
                              onClick={() => !locked && setActiveView(child.key)}
                              title={locked ? "Accès restreint" : undefined}
                              className={`${subBase} ${
                                locked
                                  ? "text-muted-foreground/30 cursor-not-allowed dark:text-white/20"
                                  : isActive
                                  ? subActive
                                  : subInactive
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                {child.icon}
                                {child.label}
                              </span>
                              {locked && (
                                <Lock size={11} className="text-muted-foreground/30 dark:text-white/20 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          }

          const isActive = activeView === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setActiveView(item.key)}
              className={`${navBase} ${isActive ? navActive : navInactive}`}
            >
              {item.icon}
              {item.label}
              {item.comingSoon && (
                <span className="ml-auto text-[10px] text-muted-foreground/50 dark:text-white/25 font-normal">
                  Bientôt
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-border dark:border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2 px-0.5">
          {/* Profil cliquable */}
          <button
            onClick={() => setActiveView("settings/profil")}
            className="flex items-center gap-2.5 flex-1 min-w-0 px-2 py-1.5 rounded-lg hover:bg-muted/60 dark:hover:bg-white/[0.05] transition-colors text-left"
          >
            <div className="w-7 h-7 rounded-full bg-muted dark:bg-white/15 flex items-center justify-center shrink-0 overflow-hidden select-none">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-semibold text-foreground dark:text-white/80">
                  {profile?.full_name?.[0]?.toUpperCase() ?? "?"}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground dark:text-white/80 truncate leading-tight">
                {profile?.full_name}
              </p>
              <p className="text-[10px] text-muted-foreground dark:text-white/35 leading-tight mt-0.5">
                {ROLE_LABELS[profile?.role ?? ""] ?? profile?.role}
              </p>
            </div>
          </button>

          {/* Toggle thème */}
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground dark:hover:bg-white/10 dark:text-white/30 dark:hover:text-white/65 transition-colors shrink-0"
            title={resolvedTheme === "dark" ? "Mode jour" : "Mode nuit"}
          >
            {resolvedTheme === "dark" ? <Moon size={14} /> : <Sun size={14} />}
          </button>

          {/* Déconnexion */}
          <button
            onClick={onSignOut}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground dark:hover:bg-white/10 dark:text-white/30 dark:hover:text-white/65 transition-colors shrink-0"
            title="Se déconnecter"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
