import { FileText, Home, LogOut, MessageSquare, Moon, Receipt, Sun, FolderOpen } from "lucide-react";
import { useTheme } from "next-themes";
import logo from "@/assets/logo-capisen.png";
import type { ClientRecord } from "@/contexts/AuthContext";

interface ClientSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSignOut: () => void;
  activeView: string;
  setActiveView: (view: string) => void;
  clientRecord: ClientRecord | null;
}

const NAV_ITEMS = [
  { key: "home",      label: "Accueil",     icon: <Home size={16} /> },
  { key: "projets",   label: "Mes projets", icon: <FolderOpen size={16} /> },
  { key: "documents", label: "Documents",   icon: <FileText size={16} /> },
  { key: "messages",  label: "Messagerie",  icon: <MessageSquare size={16} /> },
  { key: "factures",  label: "Facturation", icon: <Receipt size={16} /> },
];

const ClientSidebar = ({
  isOpen,
  onClose,
  onSignOut,
  activeView,
  setActiveView,
  clientRecord,
}: ClientSidebarProps) => {
  const { resolvedTheme, setTheme } = useTheme();

  const initials = (clientRecord?.full_name ?? "?").slice(0, 2).toUpperCase();

  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-56 flex flex-col bg-sidebar border-r border-border transition-transform duration-200 lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="px-4 py-4 border-b border-border shrink-0">
          <img
            src={logo}
            alt="CAPISEN"
            className="h-7 w-auto"
            style={{
              filter: resolvedTheme === "dark"
                ? "invert(1) brightness(2)"
                : "none",
            }}
          />
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveView(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                  isActive
                    ? "bg-muted text-foreground font-medium dark:bg-white/[0.09] dark:text-white"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground dark:text-white/50 dark:hover:bg-white/[0.05] dark:hover:text-white/80"
                }`}
              >
                <span className="shrink-0">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer utilisateur */}
        <div className="px-3 py-3 border-t border-border dark:border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2 px-0.5">
            <div className="flex items-center gap-2.5 flex-1 min-w-0 px-2 py-1.5 rounded-lg">
              <div className="w-7 h-7 rounded-full bg-muted dark:bg-white/15 flex items-center justify-center shrink-0 select-none">
                <span className="text-xs font-semibold text-foreground dark:text-white/80">{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground dark:text-white/80 truncate leading-tight">
                  {clientRecord?.full_name ?? "—"}
                </p>
                <p className="text-[10px] text-muted-foreground dark:text-white/35 leading-tight mt-0.5 truncate">
                  {clientRecord?.company_name || "Client"}
                </p>
              </div>
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
    </>
  );
};

export default ClientSidebar;
