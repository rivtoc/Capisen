import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Pencil, Trash2, X, Loader2, ChevronDown, ChevronRight } from "lucide-react";

interface Prestation {
  id: string;
  offre_id: string | null;
  title: string;
  description: string | null;
}

interface Offre {
  id: string;
  title: string;
  description: string | null;
  prestations: Prestation[];
}

type FormMode = { type: "offre"; editId: string | null } | { type: "prestation"; editId: string | null; offreId: string };

const MailOffres = () => {
  const [offres, setOffres] = useState<Offre[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<FormMode | null>(null);

  // Champs du formulaire
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    const [{ data: offresData }, { data: prestationsData }] = await Promise.all([
      supabase.from("offres_prestation").select("*").order("title"),
      supabase.from("prestations").select("*").order("title"),
    ]);

    const prestations = (prestationsData ?? []) as Prestation[];
    const result: Offre[] = (offresData ?? []).map((o) => ({
      ...o,
      prestations: prestations.filter((p) => p.offre_id === o.id),
    }));

    setOffres(result);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openAddOffre = () => {
    setTitle("");
    setDescription("");
    setError(null);
    setForm({ type: "offre", editId: null });
  };

  const openEditOffre = (o: Offre) => {
    setTitle(o.title);
    setDescription(o.description ?? "");
    setError(null);
    setForm({ type: "offre", editId: o.id });
  };

  const openAddPrestation = (offreId: string) => {
    setTitle("");
    setDescription("");
    setError(null);
    setForm({ type: "prestation", editId: null, offreId });
    setExpanded((prev) => new Set(prev).add(offreId));
  };

  const openEditPrestation = (p: Prestation) => {
    setTitle(p.title);
    setDescription(p.description ?? "");
    setError(null);
    setForm({ type: "prestation", editId: p.id, offreId: p.offre_id! });
  };

  const handleSave = async () => {
    if (!title.trim()) { setError("Le titre est requis."); return; }
    setSaving(true);

    if (form?.type === "offre") {
      if (form.editId) {
        const { error: e } = await supabase.from("offres_prestation")
          .update({ title: title.trim(), description: description || null })
          .eq("id", form.editId);
        if (e) { setError(e.message); setSaving(false); return; }
      } else {
        const { error: e } = await supabase.from("offres_prestation")
          .insert({ title: title.trim(), description: description || null });
        if (e) { setError(e.message); setSaving(false); return; }
      }
    } else if (form?.type === "prestation") {
      if (form.editId) {
        const { error: e } = await supabase.from("prestations")
          .update({ title: title.trim(), description: description || null })
          .eq("id", form.editId);
        if (e) { setError(e.message); setSaving(false); return; }
      } else {
        const { error: e } = await supabase.from("prestations")
          .insert({ title: title.trim(), description: description || null, offre_id: form.offreId });
        if (e) { setError(e.message); setSaving(false); return; }
      }
    }

    await fetchData();
    setForm(null);
    setSaving(false);
  };

  const handleDeleteOffre = async (id: string) => {
    if (!confirm("Supprimer cette offre et toutes ses prestations ?")) return;
    await supabase.from("prestations").delete().eq("offre_id", id);
    await supabase.from("offres_prestation").delete().eq("id", id);
    setOffres((prev) => prev.filter((o) => o.id !== id));
  };

  const handleDeletePrestation = async (id: string, offreId: string) => {
    if (!confirm("Supprimer cette prestation ?")) return;
    await supabase.from("prestations").delete().eq("id", id);
    setOffres((prev) =>
      prev.map((o) =>
        o.id === offreId ? { ...o, prestations: o.prestations.filter((p) => p.id !== id) } : o
      )
    );
  };

  const isFormForOffre = (offreId: string) =>
    form?.type === "offre" && form.editId === offreId;

  const isFormAddingPrestationFor = (offreId: string) =>
    form?.type === "prestation" && form.offreId === offreId && !form.editId;

  const isFormEditingPrestation = (prestationId: string) =>
    form?.type === "prestation" && form.editId === prestationId;

  const FormBlock = ({ onCancel }: { onCancel: () => void }) => (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mt-3">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-foreground">Titre *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            placeholder={form?.type === "offre" ? "Ex : Développement web" : "Ex : Site vitrine 5 pages"}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-foreground">
            Description <span className="text-muted-foreground font-normal">(optionnel)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Description courte…"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition resize-none"
          />
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white text-xs font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {saving && <Loader2 size={12} className="animate-spin" />}
          {form?.editId ? "Enregistrer" : "Ajouter"}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-white transition-colors"
        >
          Annuler
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground mb-1">Offres & Prestations</h2>
          <p className="text-sm text-muted-foreground">
            Gérez le catalogue des services proposés par Capisen.
          </p>
        </div>
        <button
          onClick={openAddOffre}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors"
        >
          <Plus size={16} />
          Nouvelle offre
        </button>
      </div>

      {/* Formulaire nouvelle offre (global) */}
      {form?.type === "offre" && form.editId === null && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Nouvelle offre</h3>
            <button onClick={() => setForm(null)}>
              <X size={16} className="text-muted-foreground hover:text-foreground transition-colors" />
            </button>
          </div>
          <FormBlock onCancel={() => setForm(null)} />
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Chargement…</div>
      ) : offres.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-white border border-gray-200 rounded-2xl">
          <p className="text-sm">Aucune offre. Créez votre première offre ci-dessus.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {offres.map((o) => {
            const isOpen = expanded.has(o.id);
            return (
              <div key={o.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                {/* En-tête offre */}
                <div className="flex items-center gap-3 px-5 py-4">
                  <button
                    onClick={() => toggleExpand(o.id)}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left"
                  >
                    {isOpen ? (
                      <ChevronDown size={16} className="text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight size={16} className="text-muted-foreground shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground text-sm">{o.title}</p>
                      {o.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{o.description}</p>
                      )}
                    </div>
                    <span className="ml-2 shrink-0 text-xs text-muted-foreground bg-gray-100 px-2 py-0.5 rounded-full">
                      {o.prestations.length} prestation{o.prestations.length !== 1 ? "s" : ""}
                    </span>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEditOffre(o)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteOffre(o.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Formulaire modification offre */}
                {isFormForOffre(o.id) && (
                  <div className="px-5 pb-4 border-t border-gray-100">
                    <FormBlock onCancel={() => setForm(null)} />
                  </div>
                )}

                {/* Prestations (section dépliée) */}
                {isOpen && !isFormForOffre(o.id) && (
                  <div className="border-t border-gray-100 px-5 py-4">
                    {o.prestations.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {o.prestations.map((p) => (
                          <div key={p.id}>
                            <div className="flex items-start justify-between gap-3 pl-4 border-l-2 border-gray-200 py-1.5">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-foreground">{p.title}</p>
                                {p.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => openEditPrestation(p)}
                                  className="p-1 rounded-lg hover:bg-gray-100 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  onClick={() => handleDeletePrestation(p.id, o.id)}
                                  className="p-1 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                            {/* Formulaire modification prestation */}
                            {isFormEditingPrestation(p.id) && (
                              <div className="pl-4">
                                <FormBlock onCancel={() => setForm(null)} />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Formulaire nouvelle prestation */}
                    {isFormAddingPrestationFor(o.id) ? (
                      <div className="pl-4">
                        <FormBlock onCancel={() => setForm(null)} />
                      </div>
                    ) : (
                      <button
                        onClick={() => openAddPrestation(o.id)}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1 pl-2"
                      >
                        <Plus size={13} />
                        Ajouter une prestation
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MailOffres;
