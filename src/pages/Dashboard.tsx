import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo-capisen.png";
import Sidebar from "@/components/dashboard/Sidebar";
import MailCompose from "@/components/dashboard/mails/MailCompose";
import MailContacts from "@/components/dashboard/mails/MailContacts";
import MailTemplates from "@/components/dashboard/mails/MailTemplates";
import MailOffres from "@/components/dashboard/mails/MailOffres";
import MailHistory from "@/components/dashboard/mails/MailHistory";
import SupervisionPole from "@/components/dashboard/supervision/SupervisionPole";
import EtudesGenerer from "@/components/dashboard/etudes/EtudesGenerer";
import EtudesHistorique from "@/components/dashboard/etudes/EtudesHistorique";
import SettingsMembers from "@/components/dashboard/settings/SettingsMembers";
import SettingsProfile from "@/components/dashboard/settings/SettingsProfile";
import type { PoleType } from "@/lib/db-types";

const Dashboard = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState("home");

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const renderContent = () => {
    // Supervision — route dynamique selon le pôle
    if (activeView.startsWith("supervision/")) {
      const pole = activeView.split("/")[1] as PoleType;
      return <SupervisionPole pole={pole} />;
    }

    switch (activeView) {
      case "mails/compose":
        return <MailCompose />;
      case "mails/contacts":
        return <MailContacts />;
      case "mails/templates":
        return <MailTemplates />;
      case "mails/offres":
        return <MailOffres />;
      case "mails/history":
        return <MailHistory />;
      case "etudes/generer":
        return <EtudesGenerer />;
      case "etudes/historique":
        return <EtudesHistorique />;
      case "settings/membres":
        return <SettingsMembers />;
      case "settings/profil":
        return <SettingsProfile />;
      case "formations":
        return (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <p className="text-lg font-medium mb-2">Formations</p>
              <p className="text-sm">Cette section est en cours de développement.</p>
            </div>
          </div>
        );
      default:
        return (
          <div className="p-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">
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
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between z-10 sticky top-0">
        <button onClick={() => setActiveView("home")}>
          <img src={logo} alt="CAPISEN" className="h-8 w-auto" />
        </button>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {profile?.full_name ?? user?.email}
          </span>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Se déconnecter
          </button>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeView={activeView} setActiveView={setActiveView} profile={profile} />
        <main className="flex-1 overflow-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
