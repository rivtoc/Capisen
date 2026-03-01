import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Pencil, Trash2, X, Loader2, Search, UserPlus } from "lucide-react";
import { CONTENT_TYPES } from "@/lib/db-types";

interface Contact {
  id: string;
  full_name: string;
  company: string | null;
  job_title: string | null;
}

interface Template {
  id: string;
  title: string;
  context: string | null;
  type: string | null;
  mentioned_contact_ids: string[] | null;
  created_by: string | null;
}

const MailTemplates = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Champs du formulaire
  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");
  const [type, setType] = useState("");
  const [mentionedContacts, setMentionedContacts] = useState<Contact[]>([]);
  const [mentionSearch, setMentionSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const mentionRef = useRef<HTMLDivElement>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    const [{ data: tData }, { data: cData }] = await Promise.all([
      supabase.from("mail_templates").select("*").order("title"),
      supabase.from("contacts").select("id, full_name, company, job_title").order("full_name"),
    ]);
    setTemplates(tData ?? []);
    setContacts(cData ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mentionRef.current && !mentionRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setMentionSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openAdd = () => {
    setTitle("");
    setContext("");
    setType("");
    setMentionedContacts([]);
    setEditId(null);
    setError(null);
    setShowForm(true);
  };

  const openEdit = (t: Template) => {
    setTitle(t.title);
    setContext(t.context ?? "");
    setType(t.type ?? "");
    setEditId(t.id);
    setError(null);
    setShowForm(true);
    const linked = contacts.filter((c) => t.mentioned_contact_ids?.includes(c.id));
    setMentionedContacts(linked);
  };

  const addMentionedContact = (c: Contact) => {
    setMentionedContacts((prev) => [...prev, c]);
    setMentionSearch("");
    setShowDropdown(false);
  };

  const removeMentionedContact = (id: string) => {
    setMentionedContacts((prev) => prev.filter((c) => c.id !== id));
  };

  const mentionSuggestions = contacts.filter(
    (c) =>
      !mentionedContacts.find((m) => m.id === c.id) &&
      c.full_name.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  const handleSave = async () => {
    if (!title.trim()) { setError("Le titre est requis."); return; }
    setSaving(true);

    const payload = {
      title: title.trim(),
      context: context || null,
      type: type || null,
      mentioned_contact_ids: mentionedContacts.length > 0 ? mentionedContacts.map((c) => c.id) : null,
    };

    if (editId) {
      const { error: e } = await supabase.from("mail_templates").update(payload).eq("id", editId);
      if (e) { setError(e.message); setSaving(false); return; }
    } else {
      const { error: e } = await supabase.from("mail_templates").insert({ ...payload, created_by: user?.id });
      if (e) { setError(e.message); setSaving(false); return; }
    }

    await fetchData();
    setShowForm(false);
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce template ?")) return;
    await supabase.from("mail_templates").delete().eq("id", id);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const typeLabel = (t: Template) =>
    CONTENT_TYPES.find((ct) => ct.value === t.type)?.label ?? null;

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground mb-1">Templates</h2>
          <p className="text-sm text-muted-foreground">Définissez les types de messages que vous envoyez.</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors"
        >
          <Plus size={16} />
          Nouveau template
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">
              {editId ? "Modifier le template" : "Nouveau template"}
            </h3>
            <button onClick={() => setShowForm(false)}>
              <X size={16} className="text-muted-foreground hover:text-foreground transition-colors" />
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {/* Titre */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Titre *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex : Prise de contact initiale"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition"
              />
            </div>

            {/* Type */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">
                Type de contenu{" "}
                <span className="text-muted-foreground font-normal">(optionnel)</span>
              </label>
              <p className="text-xs text-muted-foreground -mt-1">
                Associe ce template à un type pour qu'il apparaisse automatiquement lors de la génération.
              </p>
              <div className="flex flex-wrap gap-2">
                {CONTENT_TYPES.map((ct) => (
                  <button
                    key={ct.value}
                    type="button"
                    onClick={() => setType(type === ct.value ? "" : ct.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      type === ct.value
                        ? "bg-black text-white border-black"
                        : "bg-white text-foreground border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    {ct.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Instructions IA */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">
                Instructions pour l'IA{" "}
                <span className="text-muted-foreground font-normal">(optionnel)</span>
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={5}
                placeholder="Ex : Prise de contact initiale suite à un forum. Ton direct, objectif = obtenir un RDV…"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition resize-none"
              />
            </div>

            {/* Personnes mentionnées */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <UserPlus size={14} />
                Contacts liés{" "}
                <span className="text-muted-foreground font-normal">(optionnel)</span>
              </label>
              <p className="text-xs text-muted-foreground -mt-1">
                Ces contacts seront auto-chargés dans "Personnes mentionnées" lors de la génération.
              </p>

              {mentionedContacts.length > 0 && (
                <div className="flex flex-wrap gap-2">
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
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus-within:ring-2 focus-within:ring-black/10 focus-within:border-black transition">
                  <Search size={14} className="text-muted-foreground shrink-0" />
                  <input
                    type="text"
                    value={mentionSearch}
                    onChange={(e) => { setMentionSearch(e.target.value); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Rechercher un contact…"
                    className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                  />
                </div>

                {showDropdown && mentionSearch.length > 0 && (
                  <div className="absolute z-20 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {mentionSuggestions.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-muted-foreground">Aucun contact trouvé.</p>
                    ) : (
                      <ul className="max-h-44 overflow-y-auto divide-y divide-gray-100">
                        {mentionSuggestions.map((c) => (
                          <li key={c.id}>
                            <button
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => addMentionedContact(c)}
                              className="w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
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
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 mt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {editId ? "Enregistrer" : "Ajouter"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Chargement…</div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-white border border-gray-200 rounded-2xl">
          <p className="text-sm">Aucun template. Créez-en un pour commencer.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => {
            const linkedCount = t.mentioned_contact_ids?.length ?? 0;
            const tLabel = typeLabel(t);
            return (
              <div
                key={t.id}
                className="bg-white border border-gray-200 rounded-2xl px-5 py-4 flex items-start justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-foreground text-sm">{t.title}</p>
                    {tLabel && (
                      <span className="text-xs bg-gray-100 text-muted-foreground px-2 py-0.5 rounded-full">
                        {tLabel}
                      </span>
                    )}
                    {linkedCount > 0 && (
                      <span className="text-xs text-muted-foreground bg-gray-100 px-2 py-0.5 rounded-full">
                        {linkedCount} contact{linkedCount !== 1 ? "s" : ""} lié{linkedCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  {t.context && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.context}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(t)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MailTemplates;
