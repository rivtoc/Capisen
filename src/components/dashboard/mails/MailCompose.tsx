import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Wand2, Loader2, Copy, Check, Save } from "lucide-react";

interface Contact {
  id: string;
  full_name: string;
  company: string | null;
  job_title: string | null;
  email: string | null;
}

interface Template {
  id: string;
  title: string;
  context: string | null;
}

interface Offre {
  id: string;
  title: string;
  description: string | null;
}

const MailCompose = () => {
  const { user, profile } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [offres, setOffres] = useState<Offre[]>([]);
  const [selectedContact, setSelectedContact] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [selectedOffres, setSelectedOffres] = useState<string[]>([]);
  const [context, setContext] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.from("contacts").select("id, full_name, company, job_title, email").order("full_name").then(({ data }) => setContacts(data ?? []));
    supabase.from("mail_templates").select("id, title, context").order("title").then(({ data }) => setTemplates(data ?? []));
    supabase.from("offres_prestation").select("id, title, description").order("title").then(({ data }) => setOffres(data ?? []));
  }, []);

  if (profile?.role !== "presidence") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-medium mb-2">Accès restreint</p>
          <p className="text-sm">Cette fonctionnalité est réservée à la Présidence.</p>
        </div>
      </div>
    );
  }

  const toggleOffre = (id: string) => {
    setSelectedOffres((prev) =>
      prev.includes(id) ? prev.filter((o) => o !== id) : [...prev, id]
    );
  };

  const handleGenerate = async () => {
    if (!selectedContact || !selectedTemplate) {
      setError("Sélectionne un contact et un template.");
      return;
    }
    setError(null);
    setGenerating(true);
    setResult("");
    setSaved(false);

    const contact = contacts.find((c) => c.id === selectedContact);
    const template = templates.find((t) => t.id === selectedTemplate);
    const chosenOffres = offres.filter((o) => selectedOffres.includes(o.id));

    try {
      const res = await fetch("/api/generate-mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact, template, offres: chosenOffres, context }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur inconnue");
      setResult(data.mail);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de la génération.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    const contact = contacts.find((c) => c.id === selectedContact);
    const template = templates.find((t) => t.id === selectedTemplate);
    await supabase.from("mail_generations").insert({
      generated_by: user?.id,
      template_id: selectedTemplate || null,
      contact_id: selectedContact || null,
      prompt_final: `Contact: ${contact?.full_name}\nTemplate: ${template?.title}\nContexte: ${context}`,
      result,
    });
    setSaved(true);
    setSaving(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-8 max-w-4xl">
      <h2 className="text-xl font-bold text-foreground mb-1">Rédaction IA</h2>
      <p className="text-sm text-muted-foreground mb-8">
        Génère un mail personnalisé grâce à Claude.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Contact */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Contact *</label>
          <select
            value={selectedContact}
            onChange={(e) => setSelectedContact(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition appearance-none"
          >
            <option value="">Sélectionne un contact…</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}{c.company ? ` — ${c.company}` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Template */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Template *</label>
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition appearance-none"
          >
            <option value="">Sélectionne un template…</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Offres */}
      {offres.length > 0 && (
        <div className="mb-6">
          <label className="text-sm font-medium text-foreground block mb-2">
            Offres / Prestations <span className="text-muted-foreground font-normal">(optionnel)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {offres.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => toggleOffre(o.id)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  selectedOffres.includes(o.id)
                    ? "bg-black text-white border-black"
                    : "bg-white text-foreground border-gray-200 hover:border-gray-400"
                }`}
              >
                {o.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Contexte libre */}
      <div className="mb-6 flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">
          Contexte libre <span className="text-muted-foreground font-normal">(optionnel)</span>
        </label>
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          rows={3}
          placeholder="Ex : Je les ai rencontrés au forum Brest Avenir, ils cherchent un prestataire pour une refonte web…"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition resize-none"
        />
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <button
        onClick={handleGenerate}
        disabled={generating}
        className="flex items-center gap-2 px-6 py-3 bg-black text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-black/20 hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
      >
        {generating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
        {generating ? "Génération en cours…" : "Générer le mail"}
      </button>

      {result && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-foreground">Mail généré</h3>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copié !" : "Copier"}
              </button>
              <button
                onClick={handleSave}
                disabled={saving || saved}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                <Save size={12} />
                {saved ? "Sauvegardé ✓" : saving ? "Sauvegarde…" : "Sauvegarder"}
              </button>
            </div>
          </div>
          <textarea
            value={result}
            onChange={(e) => setResult(e.target.value)}
            rows={18}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition resize-none"
          />
        </div>
      )}
    </div>
  );
};

export default MailCompose;
