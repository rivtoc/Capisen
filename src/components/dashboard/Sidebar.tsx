import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Mail, Settings, ChevronDown,
  Lock, Wand2, Users, FileText, Package, History,
  BarChart3, FolderOpen, FilePlus, Building2, UserCog, UserCircle, X, LogOut,
  Sun, Moon,
} from "lucide-react";
import { useTheme } from "next-themes";
import type { UserProfile } from "@/contexts/AuthContext";
import { POLE_OPTIONS } from "@/lib/db-types";
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
  normal: "Membre",
  responsable: "Responsable",
  presidence: "Présidence",
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
  const isResponsable = profile?.role === "responsable";
  const userPole = profile?.pole;

  const visiblePoles = isPresidence
    ? POLE_OPTIONS
    : POLE_OPTIONS.filter((p: (typeof POLE_OPTIONS)[number]) => p.value === userPole);

  const formationsSubItems: SubItem[] = visiblePoles.map((p) => ({
    key: `formations/${p.value}`,
    label: p.label,
    icon: <Building2 size={14} />,
  }));

  const supervisionVisible = isPresidence || isResponsable;
  const etudesVisible =
    userPole === "presidence" || userPole === "etude" || userPole === "qualite";

  const menuItems: MenuItem[] = [
    {
      key: "formations",
      label: "Formations",
      icon: <BookOpen size={16} />,
      children: formationsSubItems,
    },
    {
      key: "supervision",
      label: "Supervision",
      icon: <BarChart3 size={16} />,
      hidden: !supervisionVisible,
    },
    {
      key: "mails",
      label: "Mails",
      icon: <Mail size={16} />,
      hidden: !isPresidence,
      children: [
        { key: "mails/compose", label: "Rédaction IA", icon: <Wand2 size={14} /> },
        { key: "mails/contacts", label: "Contacts", icon: <Users size={14} /> },
        { key: "mails/templates", label: "Templates", icon: <FileText size={14} /> },
        { key: "mails/offres", label: "Offres", icon: <Package size={14} /> },
        { key: "mails/history", label: "Historique", icon: <History size={14} /> },
      ],
    },
    {
      key: "etudes",
      label: "Études",
      icon: <FolderOpen size={16} />,
      hidden: !etudesVisible,
      children: [
        { key: "etudes/generer", label: "Générer", icon: <FilePlus size={14} /> },
        { key: "etudes/historique", label: "Historique", icon: <History size={14} /> },
      ],
    },
    {
      key: "settings",
      label: "Paramètres",
      icon: <Settings size={16} />,
      children: [
        {
          key: "settings/membres",
          label: "Membres",
          icon: <UserCog size={14} />,
          locked: !isPresidence,
        },
        {
          key: "settings/profil",
          label: "Mon profil",
          icon: <UserCircle size={14} />,
        },
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
      <div className="px-3 py-3 border-t border-border shrink-0">
        <div className="flex items-center gap-3 px-2.5 py-2">
          <div className="w-7 h-7 rounded-full bg-muted dark:bg-white/15 flex items-center justify-center text-foreground dark:text-white/80 text-xs font-semibold shrink-0 select-none">
            {profile?.full_name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground dark:text-white/80 truncate leading-tight">
              {profile?.full_name}
            </p>
            <p className="text-[10px] text-muted-foreground dark:text-white/35 leading-tight mt-0.5">
              {ROLE_LABELS[profile?.role ?? ""] ?? profile?.role}
            </p>
          </div>
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground dark:hover:bg-white/10 dark:text-white/30 dark:hover:text-white/65 transition-colors shrink-0"
            title={resolvedTheme === "dark" ? "Mode jour" : "Mode nuit"}
          >
            {resolvedTheme === "dark" ? <Moon size={14} /> : <Sun size={14} />}
          </button>
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
