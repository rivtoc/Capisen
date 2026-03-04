import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo-capisen.png";
import { Check, Eye, EyeOff, Loader2 } from "lucide-react";

const Setup = () => {
  const navigate = useNavigate();
  const { session, userType, loading: authLoading } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si pas de session après chargement → renvoyer au portail
  useEffect(() => {
    if (!authLoading && !session) {
      navigate("/portail", { replace: true });
    }
  }, [authLoading, session, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (updateError) {
      setError("Erreur lors de la définition du mot de passe.");
      return;
    }

    setDone(true);
    setTimeout(() => {
      navigate(userType === "client" ? "/client" : "/dashboard", { replace: true });
    }, 1500);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
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
            <img src={logo} alt="CAPISEN" className="h-10 w-auto" />
          </a>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 animate-fade-up">
          {done ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <Check size={22} className="text-green-600" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-1">Mot de passe défini !</h2>
              <p className="text-sm text-muted-foreground">Redirection en cours…</p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-foreground mb-1">Bienvenue !</h1>
              <p className="text-sm text-muted-foreground mb-8">
                Choisissez un mot de passe pour accéder à votre espace.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">Mot de passe</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Au moins 8 caractères"
                      required
                      className="w-full px-4 py-3 pr-10 rounded-xl border border-gray-200 bg-gray-50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">Confirmer le mot de passe</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Répétez votre mot de passe"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={saving || !password || !confirm}
                  className="mt-2 w-full py-3 bg-black text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-black/20 hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                >
                  {saving ? <Loader2 size={15} className="animate-spin mx-auto" /> : "Accéder à mon espace"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Setup;
