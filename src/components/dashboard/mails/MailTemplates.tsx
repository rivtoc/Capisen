import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Pencil, Trash2, X, Loader2 } from "lucide-react";

interface Template {
  id: string;
  title: string;
  context: string | null;
  created_by: string | null;
}

const MailTemplates = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = async () => {
    const { data } = await supabase.from("mail_templates").select("*").order("title");
    setTemplates(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, []);

  const openAdd = () => {
    setTitle("");
    setContext("");
    setEditId(null);
    setError(null);
    setShowForm(true);
  };

  const openEdit = (t: Template) => {
    setTitle(t.title);
    setContext(t.context ?? "");
    setEditId(t.id);
    setError(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!title.trim()) { setError("Le titre est requis."); return; }
    setSaving(true);
    if (editId) {
      const { error: e } = await supabase.from("mail_templates")
        .update({ title: title.trim(), context: context || null })
        .eq("id", editId);
      if (e) { setError(e.message); setSaving(false); return; }
    } else {
      const { error: e } = await supabase.from("mail_templates")
        .insert({ title: title.trim(), context: context || null, created_by: user?.id });
      if (e) { setError(e.message); setSaving(false); return; }
    }
    await fetchTemplates();
    setShowForm(false);
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce template ?")) return;
    await supabase.from("mail_templates").delete().eq("id", id);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground mb-1">Templates</h2>
          <p className="text-sm text-muted-foreground">Définissez les types de mails que vous envoyez.</p>
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

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">
                Instructions pour l'IA{" "}
                <span className="text-muted-foreground font-normal">(optionnel)</span>
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={5}
                placeholder="Ex : Ce mail est une prise de contact initiale. Le ton doit être professionnel mais chaleureux. L'objectif est d'obtenir un premier rendez-vous…"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition resize-none"
              />
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
          <p className="text-sm">Aucun template. Créez-en un pour commencer à générer des mails.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <div
              key={t.id}
              className="bg-white border border-gray-200 rounded-2xl px-5 py-4 flex items-start justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground text-sm">{t.title}</p>
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
          ))}
        </div>
      )}
    </div>
  );
};

export default MailTemplates;
