import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo-capisen.png";
import { Menu } from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";
import MailCompose from "@/components/dashboard/mails/MailCompose";
import MailContacts from "@/components/dashboard/mails/MailContacts";
import MailTemplates from "@/components/dashboard/mails/MailTemplates";
import MailOffres from "@/components/dashboard/mails/MailOffres";
import MailHistory from "@/components/dashboard/mails/MailHistory";
import SupervisionGlobal from "@/components/dashboard/supervision/SupervisionGlobal";
import FormationsPole from "@/components/dashboard/formations/FormationsPole";
import EtudesGenerer from "@/components/dashboard/etudes/EtudesGenerer";
import EtudesHistorique from "@/components/dashboard/etudes/EtudesHistorique";
import SettingsMembers from "@/components/dashboard/settings/SettingsMembers";
import SettingsProfile from "@/components/dashboard/settings/SettingsProfile";
import type { PoleType } from "@/lib/db-types";

const Dashboard = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState(
    () => localStorage.getItem("capisen_activeView") ?? "home"
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // Sur mobile, ferme le sidebar après navigation
  const handleSetActiveView = (view: string) => {
    setActiveView(view);
    localStorage.setItem("capisen_activeView", view);
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const renderContent = () => {
    if (activeView === "supervision") {
      return <SupervisionGlobal />;
    }

    if (activeView.startsWith("formations/")) {
      const pole = activeView.split("/")[1] as PoleType;
      return <FormationsPole pole={pole} />;
    }

    switch (activeView) {
      case "mails/compose":    return <MailCompose />;
      case "mails/contacts":  return <MailContacts />;
      case "mails/templates": return <MailTemplates />;
      case "mails/offres":    return <MailOffres />;
      case "mails/history":   return <MailHistory />;
      case "etudes/generer":      return <EtudesGenerer />;
      case "etudes/historique":   return <EtudesHistorique />;
      case "settings/membres":    return <SettingsMembers />;
      case "settings/profil":     return <SettingsProfile />;
      default:
        return (
          <div className="p-4 md:p-8 max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold text-foreground mb-1">
              Bienvenue{profile?.full_name ? `, ${profile.full_name}` : ""} 👋
            </h1>
            <p className="text-muted-foreground mb-8">
              Pôle <strong>{profile?.pole}</strong> · Rôle <strong>{profile?.role}</strong>
            </p>
            <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-muted-foreground">
              <p className="text-lg font-medium mb-2">Tableau de bord CAPISEN</p>
              <p className="text-sm">Sélectionnez une fonctionnalité dans le menu à gauche.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex items-center justify-between z-50 sticky top-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors text-muted-foreground"
            aria-label="Ouvrir/fermer le menu"
          >
            <Menu size={20} />
          </button>
          <button onClick={() => handleSetActiveView("home")}>
            <img src={logo} alt="CAPISEN" className="h-8 w-auto" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-sm text-muted-foreground truncate max-w-[180px]">
            {profile?.full_name ?? user?.email}
          </span>
          <button
            onClick={handleSignOut}
            className="px-3 md:px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            Se déconnecter
          </button>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Backdrop mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          activeView={activeView}
          setActiveView={handleSetActiveView}
          profile={profile}
        />

        <main className="flex-1 overflow-auto min-w-0">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
