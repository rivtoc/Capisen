import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { POLE_OPTIONS, type PoleType } from "@/lib/db-types";
import logo from "@/assets/logo-capisen.png";

const ALLOWED_DOMAIN = "capisen.fr";

const SignUp = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [pole, setPole] = useState<PoleType | "">("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation domaine
    const domain = email.split("@")[1];
    if (domain !== ALLOWED_DOMAIN) {
      setError(`Seules les adresses @${ALLOWED_DOMAIN} sont autorisées.`);
      return;
    }

    // Validation mot de passe
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, pole, role: "normal" },
      },
    });

    if (error) {
      setError(error.message);
    } else if (!data.user || data.user.identities?.length === 0) {
      setError("Cette adresse e-mail est déjà utilisée. Connecte-toi ou réinitialise ton mot de passe.");
    } else {
      // Le profil sera créé automatiquement au premier login, après confirmation du mail
      setSuccess(true);
    }

    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-100 via-gray-50 to-white flex flex-col items-center justify-center px-4">
        <div className="relative z-10 w-full max-w-md text-center">
          <div className="flex justify-center mb-8">
            <img src={logo} alt="CAPISEN" className="h-10 w-auto" />
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 animate-fade-up">
            <div className="w-12 h-12 bg-green-50 border border-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">Compte créé !</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Un e-mail de confirmation a été envoyé à <strong>{email}</strong>.
              Clique sur le lien pour activer ton compte.
            </p>
            <button
              onClick={() => navigate("/login")}
              className="w-full py-3 bg-black text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-black/20 hover:scale-[1.02] transition-all duration-200"
            >
              Retour à la connexion
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 via-gray-50 to-white flex flex-col items-center justify-center px-4">
      <div className="absolute inset-0 z-0 overflow-hidden opacity-30 pointer-events-none">
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-gray-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
        <div className="absolute top-1/3 -right-48 w-96 h-96 bg-gray-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-gray-200 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="flex justify-center mb-8">
          <a href="/" aria-label="Retour à l'accueil">
            <img src={logo} alt="CAPISEN - Junior Entreprise ISEN Brest" className="h-10 w-auto" />
          </a>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 animate-fade-up">
          <h1 className="text-2xl font-bold text-foreground mb-1">Créer un compte</h1>
          <p className="text-sm text-muted-foreground mb-8">
            Réservé aux membres Capisen{" "}
            <span className="font-medium text-foreground">(@{ALLOWED_DOMAIN})</span>.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Nom complet */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="fullName" className="text-sm font-medium text-foreground">
                Nom complet
              </label>
              <input
                id="fullName"
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Prénom Nom"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition"
              />
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Adresse e-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={`prenom.nom@${ALLOWED_DOMAIN}`}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition"
              />
            </div>

            {/* Pôle */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="pole" className="text-sm font-medium text-foreground">
                Pôle
              </label>
              <select
                id="pole"
                required
                value={pole}
                onChange={(e) => setPole(e.target.value as PoleType)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition appearance-none"
              >
                <option value="" disabled>Sélectionne ton pôle…</option>
                {POLE_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            {/* Mot de passe */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8 caractères minimum"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition"
              />
            </div>

            {/* Confirmer le mot de passe */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                Confirmer le mot de passe
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full py-3 bg-black text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-black/20 hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
            >
              {loading ? "Création en cours…" : "Créer mon compte"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Déjà un compte ?{" "}
            <button
              onClick={() => navigate("/login")}
              className="font-medium text-foreground hover:underline"
            >
              Se connecter
            </button>
          </p>
        </div>

        <div className="mt-6 text-center">
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

export default SignUp;
