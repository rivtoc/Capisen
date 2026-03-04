import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ThemeProvider, useTheme } from "next-themes";
import { useAuth } from "@/contexts/AuthContext";
import ClientSidebar from "@/components/client/ClientSidebar";
import ClientHome from "@/components/client/ClientHome";
import ClientProjets from "@/components/client/ClientProjets";
import ClientDocuments from "@/components/client/ClientDocuments";
import ClientMessages from "@/components/client/ClientMessages";
import ClientFactures from "@/components/client/ClientFactures";
import { Menu } from "lucide-react";
import logo from "@/assets/logo-capisen.png";

const ClientPortalContent = () => {
  const { clientRecord, signOut } = useAuth();
  const { resolvedTheme } = useTheme();
  const effectiveTheme = resolvedTheme ?? (localStorage.getItem("capisen-theme") ?? "light");
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState(
    () => localStorage.getItem("capisen_client_view") ?? "home"
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSetActiveView = (view: string) => {
    setActiveView(view);
    localStorage.setItem("capisen_client_view", view);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const renderContent = () => {
    switch (activeView) {
      case "projets":   return <ClientProjets />;
      case "documents": return <ClientDocuments />;
      case "messages":  return <ClientMessages />;
      case "factures":  return <ClientFactures />;
      default:          return <ClientHome setActiveView={handleSetActiveView} />;
    }
  };

  return (
    <div data-theme={effectiveTheme} className="h-screen flex overflow-hidden bg-background">
      <ClientSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSignOut={handleSignOut}
        activeView={activeView}
        setActiveView={handleSetActiveView}
        clientRecord={clientRecord}
      />

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-background shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Menu size={18} />
          </button>
          <img src={logo} alt="CAPISEN" className="h-6 w-auto" />
        </div>

        <main className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.18 }}
              className="h-full"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

const ClientPortal = () => (
  <ThemeProvider attribute="class" defaultTheme="light" storageKey="capisen-theme">
    <ClientPortalContent />
  </ThemeProvider>
);

export default ClientPortal;
