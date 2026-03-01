import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Wand2, Loader2, Copy, Check, Save, X, Search, UserPlus, SendHorizonal, RotateCcw } from "lucide-react";
import { CONTENT_TYPES } from "@/lib/db-types";

type Message = { role: "user" | "assistant"; content: string };

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
  type: string | null;
  mentioned_contact_ids?: string[] | null;
}

interface Offre {
  id: string;
  title: string;
  description: string | null;
}

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const MailCompose = () => {
  const { user, profile } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [offres, setOffres] = useState<Offre[]>([]);

  // Type de contenu
  const [contentType, setContentType] = useState<string>("mail_client");

  // Destinataires multiples
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const contactRef = useRef<HTMLDivElement>(null);

  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [selectedOffres, setSelectedOffres] = useState<string[]>([]);
  const [context, setContext] = useState("");

  // Contacts mentionnés dans le contexte
  const [mentionedContacts, setMentionedContacts] = useState<Contact[]>([]);
  const [mentionSearch, setMentionSearch] = useState("");
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const mentionRef = useRef<HTMLDivElement>(null);

  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Raffinement conversationnel
  const [conversation, setConversation] = useState<Message[]>([]);
  const [refinementInput, setRefinementInput] = useState("");
  const [refining, setRefining] = useState(false);
  const [refinementError, setRefinementError] = useState<string | null>(null);
  const [pastRefinements, setPastRefinements] = useState<string[]>([]);

  useEffect(() => {
    supabase.from("contacts").select("id, full_name, company, job_title, email").order("full_name").then(({ data }) => setContacts(data ?? []));
    supabase.from("mail_templates").select("id, title, context, type, mentioned_contact_ids").order("title").then(({ data }) => setTemplates(data ?? []));
    supabase.from("offres_prestation").select("id, title, description").order("title").then(({ data }) => setOffres(data ?? []));
  }, []);

  // Fermer les dropdowns si clic en dehors
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contactRef.current && !contactRef.current.contains(e.target as Node)) {
        setShowContactDropdown(false);
        setContactSearch("");
      }
      if (mentionRef.current && !mentionRef.current.contains(e.target as Node)) {
        setShowMentionDropdown(false);
        setMentionSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  const isPost = contentType === "linkedin_post";

  // Templates filtrés : ceux du bon type ou sans type (tous types)
  const filteredTemplates = templates.filter((t) => !t.type || t.type === contentType);

  const handleContentTypeChange = (type: string) => {
    setContentType(type);
    setSelectedTemplate(""); // reset car la liste filtrée change
    setMentionedContacts([]);
  };

  const toggleOffre = (id: string) => {
    setSelectedOffres((prev) =>
      prev.includes(id) ? prev.filter((o) => o !== id) : [...prev, id]
    );
  };

  // --- Destinataires ---
  const contactSuggestions = (() => {
    const already = new Set(selectedContacts.map((c) => c.id));
    if (!contactSearch.trim()) return contacts.filter((c) => !already.has(c.id));
    const tokens = normalize(contactSearch).split(" ").filter(Boolean);
    return contacts.filter((c) => {
      if (already.has(c.id)) return false;
      const haystack = normalize([c.full_name, c.company, c.job_title].filter(Boolean).join(" "));
      return tokens.every((t) => haystack.includes(t));
    });
  })();

  const addSelectedContact = (c: Contact) => {
    setSelectedContacts((prev) => [...prev, c]);
    setContactSearch("");
    setShowContactDropdown(false);
  };

  const removeSelectedContact = (id: string) => {
    setSelectedContacts((prev) => prev.filter((c) => c.id !== id));
  };

  // --- Contacts mentionnés ---
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find((t) => t.id === templateId);
    if (template?.mentioned_contact_ids?.length) {
      const linked = contacts.filter((c) => template.mentioned_contact_ids!.includes(c.id));
      setMentionedContacts(linked);
    }
  };

  const mentionSuggestions = contacts.filter(
    (c) =>
      !mentionedContacts.find((m) => m.id === c.id) &&
      c.full_name.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  const addMentionedContact = (c: Contact) => {
    setMentionedContacts((prev) => [...prev, c]);
    setMentionSearch("");
    setShowMentionDropdown(false);
  };

  const removeMentionedContact = (id: string) => {
    setMentionedContacts((prev) => prev.filter((c) => c.id !== id));
  };

  // --- Génération initiale ---
  const handleGenerate = async () => {
    const needsContact = !isPost;
    if ((needsContact && !selectedContacts.length) || !selectedTemplate) {
      setError(
        needsContact
          ? "Sélectionne au moins un contact et un template."
          : "Sélectionne un template."
      );
      return;
    }
    setError(null);
    setGenerating(true);
    setResult("");
    setSaved(false);
    setConversation([]);
    setPastRefinements([]);
    setRefinementInput("");
    setRefinementError(null);

    const template = templates.find((t) => t.id === selectedTemplate);
    const chosenOffres = offres.filter((o) => selectedOffres.includes(o.id));

    try {
      const res = await fetch("/api/generate-mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contacts: selectedContacts,
          contentType,
          template,
          offres: chosenOffres,
          context,
          mentionedContacts,
          sender: profile
            ? { full_name: profile.full_name, role: profile.role, pole: profile.pole }
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur inconnue");
      setResult(data.mail);
      setConversation(data.messages ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de la génération.");
    } finally {
      setGenerating(false);
    }
  };

  // --- Raffinement conversationnel ---
  const handleRefine = async () => {
    if (!refinementInput.trim() || refining) return;
    const request = refinementInput.trim();
    setRefinementError(null);
    setRefining(true);
    setRefinementInput("");

    try {
      const res = await fetch("/api/generate-mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: conversation,
          refinement: request,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur inconnue");
      setResult(data.mail);
      setConversation(data.messages ?? []);
      setPastRefinements((prev) => [...prev, request]);
      setSaved(false);
    } catch (err: unknown) {
      setRefinementError(err instanceof Error ? err.message : "Erreur lors du raffinement.");
      setRefinementInput(request);
    } finally {
      setRefining(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    const primaryContact = selectedContacts[0];
    const template = templates.find((t) => t.id === selectedTemplate);
    const contactNames = selectedContacts.map((c) => c.full_name).join(", ");
    await supabase.from("mail_generations").insert({
      generated_by: user?.id,
      template_id: selectedTemplate || null,
      contact_id: primaryContact?.id || null,
      prompt_final: `Type: ${contentType}\nContact(s): ${contactNames || "—"}\nTemplate: ${template?.title}\nContexte: ${context}`,
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

  const resultLabel = CONTENT_TYPES.find((ct) => ct.value === contentType)?.label ?? "Résultat";

  return (
    <div className="p-8 max-w-4xl">
      <h2 className="text-xl font-bold text-foreground mb-1">Rédaction IA</h2>
      <p className="text-sm text-muted-foreground mb-8">
        Génère un mail, un message ou un post grâce à Claude.
      </p>

      {/* Type de contenu */}
      <div className="mb-6 flex flex-col gap-2">
        <label className="text-sm font-medium text-foreground">Type de contenu *</label>
        <div className="flex flex-wrap gap-2">
          {CONTENT_TYPES.map((ct) => (
            <button
              key={ct.value}
              type="button"
              onClick={() => handleContentTypeChange(ct.value)}
              className={`px-4 py-2 rounded-xl text-sm border transition-colors ${
                contentType === ct.value
                  ? "bg-black text-white border-black"
                  : "bg-white text-foreground border-gray-200 hover:border-gray-400"
              }`}
            >
              {ct.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contact(s) destinataire(s) — masqué pour les posts LinkedIn */}
      {!isPost && (
        <div className="mb-6 flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Contact(s) destinataire(s) *</label>

          <div ref={contactRef} className="relative">
            {selectedContacts.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedContacts.map((c) => (
                  <span
                    key={c.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black text-white text-sm rounded-lg"
                  >
                    <span className="font-medium">{c.full_name}</span>
                    {c.company && (
                      <span className="text-gray-300 text-xs">— {c.company}</span>
                    )}
                    <button
                      onClick={() => removeSelectedContact(c.id)}
                      className="ml-1 hover:text-gray-300 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus-within:ring-2 focus-within:ring-black/10 focus-within:border-black transition">
              <Search size={14} className="text-muted-foreground shrink-0" />
              <input
                type="text"
                value={contactSearch}
                onChange={(e) => {
                  setContactSearch(e.target.value);
                  setShowContactDropdown(true);
                }}
                onFocus={() => setShowContactDropdown(true)}
                placeholder={selectedContacts.length ? "Ajouter un destinataire…" : "Rechercher un contact…"}
                className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
              />
              {contactSearch && (
                <button
                  onClick={() => setContactSearch("")}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {showContactDropdown && (
              <div className="absolute z-20 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                {contactSuggestions.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-muted-foreground">
                    {contacts.length === selectedContacts.length
                      ? "Tous les contacts sont déjà sélectionnés."
                      : "Aucun contact trouvé."}
                  </p>
                ) : (
                  <ul className="max-h-52 overflow-y-auto divide-y divide-gray-100">
                    {contactSuggestions.map((c) => (
                      <li key={c.id}>
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => addSelectedContact(c)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{c.full_name}</p>
                            {(c.company || c.job_title) && (
                              <p className="text-xs text-muted-foreground">
                                {[c.job_title, c.company].filter(Boolean).join(" · ")}
                              </p>
                            )}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Template */}
      <div className="mb-6 flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">Template *</label>
        {filteredTemplates.length === 0 ? (
          <p className="text-sm text-muted-foreground px-1">
            Aucun template pour ce type — crée-en un dans la section Templates.
          </p>
        ) : (
          <select
            value={selectedTemplate}
            onChange={(e) => handleTemplateChange(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition appearance-none"
          >
            <option value="">Sélectionne un template…</option>
            {filteredTemplates.map((t) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
        )}
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
          placeholder={
            isPost
              ? "Ex : Post pour présenter notre offre d'audit SI, suite à un événement tech à Brest…"
              : "Ex : Je les ai rencontrés au forum Brest Avenir, ils cherchent un prestataire pour une refonte web…"
          }
          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition resize-none"
        />
      </div>

      {/* Personnes mentionnées — masqué pour les posts */}
      {!isPost && (
        <div className="mb-8 flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
            <UserPlus size={14} />
            Personnes mentionnées{" "}
            <span className="text-muted-foreground font-normal">(optionnel)</span>
          </label>
          <p className="text-xs text-muted-foreground -mt-1">
            Lie un contact à un nom que tu mentionnes dans le contexte — l'IA recevra son profil complet.
          </p>

          {mentionedContacts.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-1">
              {mentionedContacts.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-foreground text-sm rounded-lg"
                >
                  <span className="font-medium">{c.full_name}</span>
                  {c.company && (
                    <span className="text-muted-foreground text-xs">— {c.company}</span>
                  )}
                  <button
                    onClick={() => removeMentionedContact(c.id)}
                    className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div ref={mentionRef} className="relative">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus-within:ring-2 focus-within:ring-black/10 focus-within:border-black transition">
              <Search size={14} className="text-muted-foreground shrink-0" />
              <input
                type="text"
                value={mentionSearch}
                onChange={(e) => {
                  setMentionSearch(e.target.value);
                  setShowMentionDropdown(true);
                }}
                onFocus={() => setShowMentionDropdown(true)}
                placeholder="Rechercher un contact à mentionner…"
                className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
              />
            </div>

            {showMentionDropdown && mentionSearch.length > 0 && (
              <div className="absolute z-20 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                {mentionSuggestions.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-muted-foreground">Aucun contact trouvé.</p>
                ) : (
                  <ul className="max-h-48 overflow-y-auto divide-y divide-gray-100">
                    {mentionSuggestions.map((c) => (
                      <li key={c.id}>
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => addMentionedContact(c)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{c.full_name}</p>
                            {(c.company || c.job_title) && (
                              <p className="text-xs text-muted-foreground">
                                {[c.job_title, c.company].filter(Boolean).join(" · ")}
                              </p>
                            )}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}

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
        {generating ? "Génération en cours…" : "Générer"}
      </button>

      {result && (
        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">{resultLabel} généré</h3>
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

          {/* Zone de raffinement */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <RotateCcw size={14} className="text-muted-foreground" />
              <h4 className="text-sm font-semibold text-foreground">Affiner</h4>
            </div>

            {pastRefinements.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {pastRefinements.map((r, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-muted-foreground text-xs rounded-full"
                  >
                    <Check size={10} className="text-green-500 shrink-0" />
                    {r}
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={refinementInput}
                onChange={(e) => setRefinementInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleRefine()}
                placeholder="Ex : Rends-le plus court, change le ton, reformule l'accroche…"
                disabled={refining}
                className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition disabled:opacity-50"
              />
              <button
                onClick={handleRefine}
                disabled={!refinementInput.trim() || refining}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {refining ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <SendHorizonal size={14} />
                )}
                {refining ? "En cours…" : "Affiner"}
              </button>
            </div>

            {refinementError && (
              <p className="text-sm text-red-500">{refinementError}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MailCompose;
