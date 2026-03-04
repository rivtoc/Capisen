import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Check, Loader2, UserPlus } from "lucide-react";

const ClientsInviter = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setError("Session expirée."); setLoading(false); return; }

    const res = await fetch("/api/invite-client", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ email, full_name: fullName, company_name: companyName }),
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(json.error ?? "Erreur lors de l'invitation.");
    } else {
      setSuccess(true);
      setFullName(""); setEmail(""); setCompanyName("");
      setTimeout(() => setSuccess(false), 4000);
    }
  };

  return (
    <div className="p-10 max-w-2xl">
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-foreground">Inviter un client</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Un email d'invitation sera envoyé. Le client choisira son mot de passe à la première connexion.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Nom complet <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Prénom Nom"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/40 transition"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Entreprise</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Nom de l'entreprise"
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/40 transition"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Adresse e-mail <span className="text-red-500">*</span></label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="contact@entreprise.fr"
            required
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/40 transition"
          />
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !fullName.trim() || !email.trim()}
          className="flex items-center gap-2 px-5 py-2.5 bg-foreground text-background text-sm font-semibold rounded-xl hover:bg-foreground/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : success ? <Check size={14} /> : <UserPlus size={14} />}
          {success ? "Invitation envoyée !" : "Envoyer l'invitation"}
        </button>
      </form>
    </div>
  );
};

export default ClientsInviter;
