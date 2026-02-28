import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Pencil, Trash2, X, Loader2 } from "lucide-react";

interface Offre {
  id: string;
  title: string;
  description: string | null;
}

const MailOffres = () => {
  const [offres, setOffres] = useState<Offre[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOffres = async () => {
    const { data } = await supabase.from("offres_prestation").select("*").order("title");
    setOffres(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchOffres(); }, []);

  const openAdd = () => {
    setTitle("");
    setDescription("");
    setEditId(null);
    setError(null);
    setShowForm(true);
  };

  const openEdit = (o: Offre) => {
    setTitle(o.title);
    setDescription(o.description ?? "");
    setEditId(o.id);
    setError(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!title.trim()) { setError("Le titre est requis."); return; }
    setSaving(true);
    if (editId) {
      const { error: e } = await supabase.from("offres_prestation")
        .update({ title: title.trim(), description: description || null })
        .eq("id", editId);
      if (e) { setError(e.message); setSaving(false); return; }
    } else {
      const { error: e } = await supabase.from("offres_prestation")
        .insert({ title: title.trim(), description: description || null });
      if (e) { setError(e.message); setSaving(false); return; }
    }
    await fetchOffres();
    setShowForm(false);
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette offre ?")) return;
    await supabase.from("offres_prestation").delete().eq("id", id);
    setOffres((prev) => prev.filter((o) => o.id !== id));
  };

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground mb-1">Offres & Prestations</h2>
          <p className="text-sm text-muted-foreground">
            Gérez le catalogue des services proposés par Capisen.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors"
        >
          <Plus size={16} />
          Nouvelle offre
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">
              {editId ? "Modifier l'offre" : "Nouvelle offre"}
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
                placeholder="Ex : Développement web sur mesure"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">
                Description <span className="text-muted-foreground font-normal">(optionnel)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Décrivez brièvement cette offre ou prestation…"
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
      ) : offres.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-white border border-gray-200 rounded-2xl">
          <p className="text-sm">Aucune offre. Ajoutez les services proposés par Capisen.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {offres.map((o) => (
            <div
              key={o.id}
              className="bg-white border border-gray-200 rounded-2xl px-5 py-4 flex items-start justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground text-sm">{o.title}</p>
                {o.description && (
                  <p className="text-xs text-muted-foreground mt-1">{o.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openEdit(o)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(o.id)}
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

export default MailOffres;
