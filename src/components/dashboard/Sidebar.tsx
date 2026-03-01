import { useState } from "react";
import {
  BookOpen, Mail, Settings, ChevronDown, ChevronRight,
  Lock, Wand2, Users, FileText, Package, History,
  BarChart3, FolderOpen, FilePlus, Building2, UserCog, UserCircle,
} from "lucide-react";
import type { UserProfile } from "@/contexts/AuthContext";
import { POLE_OPTIONS } from "@/lib/db-types";

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
}

const Sidebar = ({ activeView, setActiveView, profile }: SidebarProps) => {
  const [openMenus, setOpenMenus] = useState<Set<string>>(new Set(["mails"]));

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

  // Supervision : présidence voit tous les pôles, responsable voit seulement le sien
  const supervisionVisible = isPresidence || isResponsable;
  const supervisionSubItems: SubItem[] = isPresidence
    ? POLE_OPTIONS.map((p) => ({
        key: `supervision/${p.value}`,
        label: p.label,
        icon: <Building2 size={15} />,
      }))
    : isResponsable && userPole
    ? [
        {
          key: `supervision/${userPole}`,
          label: POLE_OPTIONS.find((p) => p.value === userPole)?.label ?? userPole,
          icon: <Building2 size={15} />,
        },
      ]
    : [];

  // Études : accessible aux pôles présidence, étude, qualité
  const etudesVisible =
    userPole === "presidence" || userPole === "etude" || userPole === "qualite";

  const menuItems: MenuItem[] = [
    {
      key: "formations",
      label: "Formations",
      icon: <BookOpen size={18} />,
      comingSoon: true,
    },
    {
      key: "supervision",
      label: "Supervision",
      icon: <BarChart3 size={18} />,
      hidden: !supervisionVisible,
      children: supervisionSubItems,
    },
    {
      key: "mails",
      label: "Mails",
      icon: <Mail size={18} />,
      children: [
        { key: "mails/compose", label: "Rédaction IA", icon: <Wand2 size={15} />, locked: !isPresidence },
        { key: "mails/contacts", label: "Contacts", icon: <Users size={15} /> },
        { key: "mails/templates", label: "Templates", icon: <FileText size={15} /> },
        { key: "mails/offres", label: "Offres", icon: <Package size={15} /> },
        { key: "mails/history", label: "Historique", icon: <History size={15} /> },
      ],
    },
    {
      key: "etudes",
      label: "Études",
      icon: <FolderOpen size={18} />,
      hidden: !etudesVisible,
      children: [
        { key: "etudes/generer", label: "Générer", icon: <FilePlus size={15} /> },
        { key: "etudes/historique", label: "Historique", icon: <History size={15} /> },
      ],
    },
    {
      key: "settings",
      label: "Paramètres",
      icon: <Settings size={18} />,
      children: [
        { key: "settings/membres", label: "Membres", icon: <UserCog size={15} />, locked: !isPresidence },
        { key: "settings/profil", label: "Mon profil", icon: <UserCircle size={15} /> },
      ],
    },
  ];

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col py-4 shrink-0">
      <nav className="flex-1 px-3 space-y-1">
        {menuItems.map((item) => {
          if (item.hidden) return null;

          if (item.children) {
            const isOpen = openMenus.has(item.key);
            const isParentActive = activeView.startsWith(item.key);
            return (
              <div key={item.key}>
                <button
                  onClick={() => toggleMenu(item.key)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isParentActive
                      ? "bg-gray-100 text-foreground"
                      : "text-muted-foreground hover:bg-gray-50 hover:text-foreground"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    {item.icon}
                    {item.label}
                  </span>
                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>

                {isOpen && (
                  <div className="ml-4 mt-1 space-y-0.5 border-l border-gray-100 pl-3">
                    {item.children.map((child) => {
                      const locked = child.locked ?? false;
                      const isActive = activeView === child.key;
                      return (
                        <button
                          key={child.key}
                          onClick={() => !locked && setActiveView(child.key)}
                          title={locked ? "Accès restreint" : undefined}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                            locked
                              ? "text-gray-400 cursor-not-allowed"
                              : isActive
                              ? "bg-gray-100 text-foreground font-medium"
                              : "text-muted-foreground hover:bg-gray-50 hover:text-foreground"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            {child.icon}
                            {child.label}
                          </span>
                          {locked && <Lock size={12} className="text-gray-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const isActive = activeView === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setActiveView(item.key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-gray-100 text-foreground"
                  : "text-muted-foreground hover:bg-gray-50 hover:text-foreground"
              }`}
            >
              {item.icon}
              {item.label}
              {item.comingSoon && (
                <span className="ml-auto text-xs text-gray-400 font-normal">Bientôt</span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
