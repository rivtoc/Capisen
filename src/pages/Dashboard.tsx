import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ThemeProvider, useTheme } from "next-themes";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo-capisen.png";
import { Menu } from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";
import DashboardHome from "@/components/dashboard/DashboardHome";
import MailCompose from "@/components/dashboard/mails/MailCompose";
import MailContacts from "@/components/dashboard/mails/MailContacts";
import MailTemplates from "@/components/dashboard/mails/MailTemplates";
import MailOffres from "@/components/dashboard/mails/MailOffres";
import MailHistory from "@/components/dashboard/mails/MailHistory";
import SupervisionGlobal from "@/components/dashboard/supervision/SupervisionGlobal";
import FormationsPole from "@/components/dashboard/formations/FormationsPole";
import EtudesGenerer from "@/components/dashboard/etudes/EtudesGenerer";
import EtudesHistorique from "@/components/dashboard/etudes/EtudesHistorique";
import EtudesDocsTypes from "@/components/dashboard/etudes/EtudesDocsTypes";
import EtudesMissionsListe from "@/components/dashboard/missions/EtudesMissionsListe";
import IntervenantMissions from "@/components/dashboard/missions/IntervenantMissions";
import SettingsPage from "@/components/dashboard/settings/SettingsPage";
import ClientsListe from "@/components/dashboard/clients/ClientsListe";
import ClientsInviter from "@/components/dashboard/clients/ClientsInviter";
import ClientsProjets from "@/components/dashboard/clients/ClientsProjets";
import type { PoleType } from "@/lib/db-types";
import { canAccess } from "@/lib/permissions";

const DashboardContent = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const effectiveTheme = resolvedTheme ?? (localStorage.getItem("capisen-theme") ?? "dark");
  const [activeView, setActiveView] = useState(
    () => localStorage.getItem("capisen_activeView") ?? "home"
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleSetActiveView = (view: string) => {
    setActiveView(view);
    localStorage.setItem("capisen_activeView", view);
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const AccessDenied = () => (
    <div className="p-8 text-center text-muted-foreground text-sm">
      Vous n'avez pas accès à cette section.
    </div>
  );

  const renderContent = () => {
    // Membres sans pôle attribué : accès limité aux paramètres uniquement
    if (profile?.pole === "nouveau" && !activeView.startsWith("settings")) {
      return <SettingsPage defaultTab="profil" />;
    }

    // Intervenants : accès limité à formations, missions, paramètres
    if (
      profile?.pole === "intervenant" &&
      !activeView.startsWith("formations/") &&
      !activeView.startsWith("intervenant/") &&
      !activeView.startsWith("settings") &&
      activeView !== "home"
    ) {
      return <AccessDenied />;
    }

    if (activeView === "supervision") {
      return canAccess(profile, "supervision") ? <SupervisionGlobal /> : <AccessDenied />;
    }

    if (activeView.startsWith("formations/")) {
      const pole = activeView.split("/")[1] as PoleType;
      if (profile?.role !== "presidence" && pole !== profile?.pole) {
        return (
          <div className="p-8 text-center text-muted-foreground">
            Accès réservé au pôle {profile?.pole}.
          </div>
        );
      }
      return <FormationsPole pole={pole} />;
    }

    if (activeView.startsWith("mails/") && !canAccess(profile, "mails")) {
      return <AccessDenied />;
    }

    if (activeView.startsWith("etudes/") && !canAccess(profile, "etudes")) {
      return <AccessDenied />;
    }

    if (activeView.startsWith("clients/") && !canAccess(profile, "clients")) {
      return <AccessDenied />;
    }

    switch (activeView) {
      case "mails/compose":         return <MailCompose />;
      case "mails/contacts":        return <MailContacts />;
      case "mails/templates":       return <MailTemplates />;
      case "mails/offres":          return <MailOffres />;
      case "mails/history":         return <MailHistory />;
      case "etudes/missions":       return <EtudesMissionsListe />;
      case "etudes/generer":        return <EtudesGenerer />;
      case "etudes/docs-types":     return <EtudesDocsTypes />;
      case "etudes/historique":     return <EtudesHistorique />;
      case "clients/liste":         return <ClientsListe />;
      case "clients/inviter":       return <ClientsInviter />;
      case "clients/projets":       return <ClientsProjets />;
      case "intervenant/missions":  return <IntervenantMissions />;
      case "settings/membres":      return <SettingsPage defaultTab="membres" />;
      case "settings/profil":       return <SettingsPage defaultTab="profil" />;
      case "settings/securite":     return <SettingsPage defaultTab="securite" />;
      default:
        return <DashboardHome setActiveView={handleSetActiveView} />;
    }
  };

  return (
    <div data-theme={effectiveTheme} className="h-screen flex overflow-hidden bg-background">
      {/* Dark sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSignOut={handleSignOut}
        activeView={activeView}
        setActiveView={handleSetActiveView}
        profile={profile}
      />

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile-only top bar */}
        <header className="lg:hidden bg-background border-b border-border px-4 py-3 flex items-center gap-3 sticky top-0 z-20 shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            aria-label="Ouvrir le menu"
          >
            <Menu size={20} />
          </button>
          <button onClick={() => handleSetActiveView("home")}>
            <img src={logo} alt="CAPISEN" className="h-7 w-auto" />
          </button>
        </header>

        {/* Main content with view transitions */}
        <main className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="min-h-full"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

const Dashboard = () => (
  <ThemeProvider attribute="class" defaultTheme="light" storageKey="capisen-theme">
    <DashboardContent />
  </ThemeProvider>
);

export default Dashboard;
