import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo-capisen.png";

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 via-gray-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <a href="/">
          <img src={logo} alt="CAPISEN" className="h-8 w-auto" />
        </a>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Se déconnecter
          </button>
        </div>
      </header>

      {/* Contenu */}
      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Bienvenue dans l'espace membres
        </h1>
        <p className="text-muted-foreground mb-10">
          Connecté en tant que <strong>{user?.email}</strong>
        </p>

        {/* Placeholder — à compléter */}
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-muted-foreground">
          <p className="text-lg font-medium mb-2">Tableau de bord en construction</p>
          <p className="text-sm">Les formations et fonctionnalités arrivent bientôt.</p>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
