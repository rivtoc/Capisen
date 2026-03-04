import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo-capisen.png";
import { Briefcase, Users } from "lucide-react";

const Portail = () => {
  const navigate = useNavigate();
  const { session, userType, loading } = useAuth();

  useEffect(() => {
    if (!loading && session) {
      navigate(userType === "client" ? "/client" : "/dashboard", { replace: true });
    }
  }, [session, userType, loading, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 via-gray-50 to-white flex flex-col items-center justify-center px-4">
      {/* Fond décoratif */}
      <div className="absolute inset-0 z-0 overflow-hidden opacity-30 pointer-events-none">
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-gray-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
        <div className="absolute top-1/3 -right-48 w-96 h-96 bg-gray-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-gray-200 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <a href="/" aria-label="Retour à l'accueil">
            <img src={logo} alt="CAPISEN - Junior Entreprise ISEN Brest" className="h-10 w-auto" />
          </a>
        </div>

        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-foreground mb-2">Bienvenue sur votre espace</h1>
          <p className="text-sm text-muted-foreground">Choisissez votre espace de connexion.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Espace Membres */}
          <button
            onClick={() => navigate("/login")}
            className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 hover:shadow-md hover:border-gray-300 transition-all text-left group animate-fade-up"
          >
            <div className="w-11 h-11 rounded-xl bg-black/5 flex items-center justify-center mb-5 group-hover:bg-black/8 transition-colors">
              <Users size={20} className="text-black/70" />
            </div>
            <h2 className="font-semibold text-lg text-foreground mb-1.5">Espace Membres</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Accédez à votre espace interne Capisen — formations, études, paramètres.
            </p>
          </button>

          {/* Espace Clients */}
          <button
            onClick={() => navigate("/login")}
            className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 hover:shadow-md hover:border-gray-300 transition-all text-left group animate-fade-up [animation-delay:80ms] [animation-fill-mode:backwards]"
          >
            <div className="w-11 h-11 rounded-xl bg-black/5 flex items-center justify-center mb-5 group-hover:bg-black/8 transition-colors">
              <Briefcase size={20} className="text-black/70" />
            </div>
            <h2 className="font-semibold text-lg text-foreground mb-1.5">Espace Clients</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Suivez vos projets en cours, téléchargez vos documents et échangez avec l'équipe.
            </p>
          </button>
        </div>

        <div className="flex justify-center mt-8">
          <button
            onClick={() => navigate("/")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Retour à l'accueil
          </button>
        </div>
      </div>
    </div>
  );
};

export default Portail;
