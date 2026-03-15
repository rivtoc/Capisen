import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Check, ChevronDown, ChevronRight, Loader2, Plus, X } from "lucide-react";
import { CustomSelect } from "@/components/ui/CustomSelect";

interface Client { id: string; full_name: string; company_name: string; }
interface Projet {
  id: string;
  client_id: string;
  titre: string;
  description: string | null;
  statut: "en_cours" | "en_attente" | "termine" | "annule";
  date_debut: string | null;
  date_fin_prevue: string | null;
  client_name?: string;
}

const STATUTS = [
  { value: "en_cours",   label: "En cours" },
  { value: "en_attente", label: "En attente" },
  { value: "termine",    label: "Terminé" },
  { value: "annule",     label: "Annulé" },
] as const;

const STATUT_COLORS: Record<string, string> = {
  en_cours:   "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  en_attente: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  termine:    "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
  annule:     "bg-muted text-muted-foreground",
};

const ClientsProjets = () => {
  const [projets, setProjets] = useState<Projet[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, Partial<Projet>>>({});

  // Nouveau projet
  const [showNew, setShowNew] = useState(false);
  const [newProjet, setNewProjet] = useState({ client_id: "", titre: "", description: "", date_debut: "", date_fin_prevue: "" });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from("clients").select("id, full_name, company_name").order("full_name"),
      supabase.from("client_projets").select("*, clients!inner(full_name, company_name)").order("created_at", { ascending: false }),
    ]).then(([{ data: c }, { data: p }]) => {
      setClients((c as Client[]) ?? []);
      setProjets(
        (p ?? []).map((proj: any) => ({
          ...proj,
          client_name: proj.clients?.full_name + (proj.clients?.company_name ? ` — ${proj.clients.company_name}` : ""),
        }))
      );
      setLoading(false);
    });
  }, []);

  const getEdit = (p: Projet) => ({ ...p, ...edits[p.id] });

  const handleSave = async (projet: Projet) => {
    const e = edits[projet.id];
    if (!e) return;
    setSaving(projet.id);
    const { error } = await supabase.from("client_projets").update(e).eq("id", projet.id);
    setSaving(null);
    if (!error) {
      setProjets((prev) => prev.map((p) => p.id === projet.id ? { ...p, ...e } : p));
      setEdits((prev) => { const n = { ...prev }; delete n[projet.id]; return n; });
      setSavedId(projet.id);
      setTimeout(() => setSavedId(null), 2000);
    }
  };

  const handleCreate = async () => {
    if (!newProjet.client_id || !newProjet.titre.trim()) return;
    setCreating(true);
    const { data, error } = await supabase
      .from("client_projets")
      .insert({
        client_id: newProjet.client_id,
        titre: newProjet.titre.trim(),
        description: newProjet.description.trim() || null,
        date_debut: newProjet.date_debut || null,
        date_fin_prevue: newProjet.date_fin_prevue || null,
      })
      .select("*, clients!inner(full_name, company_name)")
      .single();
    setCreating(false);
    if (!error && data) {
      const created: Projet = {
        ...(data as any),
        client_name: (data as any).clients?.full_name + ((data as any).clients?.company_name ? ` — ${(data as any).clients.company_name}` : ""),
      };
      setProjets((prev) => [created, ...prev]);
      setShowNew(false);
      setNewProjet({ client_id: "", titre: "", description: "", date_debut: "", date_fin_prevue: "" });
    }
  };

  const isDirty = (p: Projet) => !!edits[p.id] && Object.keys(edits[p.id]).length > 0;

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Projets clients</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Gestion des projets de tous les clients.</p>
        </div>
        <button
          onClick={() => setShowNew((v) => !v)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-foreground text-background rounded-xl hover:bg-foreground/90 transition-colors"
        >
          <Plus size={14} />
          Nouveau projet
        </button>
      </div>

      {/* Formulaire nouveau projet */}
      {showNew && (
        <div className="mb-6 p-5 bg-card border border-border rounded-2xl space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Client *</label>
              <CustomSelect
                value={newProjet.client_id}
                placeholder="Sélectionner un client"
                options={clients.map((c) => ({
                  value: c.id,
                  label: c.full_name + (c.company_name ? ` — ${c.company_name}` : ""),
                }))}
                onChange={(v) => setNewProjet((p) => ({ ...p, client_id: v }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Titre *</label>
              <input
                type="text"
                value={newProjet.titre}
                onChange={(e) => setNewProjet((p) => ({ ...p, titre: e.target.value }))}
                placeholder="Nom du projet"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10 transition"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Description</label>
            <textarea
              value={newProjet.description}
              onChange={(e) => setNewProjet((p) => ({ ...p, description: e.target.value }))}
              rows={2}
              placeholder="Description du projet…"
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-foreground/10 transition"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Date de début</label>
              <input type="date" value={newProjet.date_debut} onChange={(e) => setNewProjet((p) => ({ ...p, date_debut: e.target.value }))} className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10 transition" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Date de fin prévue</label>
              <input type="date" value={newProjet.date_fin_prevue} onChange={(e) => setNewProjet((p) => ({ ...p, date_fin_prevue: e.target.value }))} className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10 transition" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleCreate} disabled={creating || !newProjet.client_id || !newProjet.titre.trim()} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-foreground text-background rounded-xl hover:bg-foreground/90 transition-colors disabled:opacity-40">
              {creating ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              Créer le projet
            </button>
            <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-xl transition-colors">
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground">Chargement…</div>
      ) : projets.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Aucun projet.</div>
      ) : (
        <div className="space-y-2">
          {projets.map((projet) => {
            const edit = getEdit(projet);
            const isOpen = expanded === projet.id;
            return (
              <div key={projet.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="flex items-center gap-4 px-5 py-3.5">
                  <button onClick={() => setExpanded(isOpen ? null : projet.id)} className="shrink-0">
                    {isOpen ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{projet.titre}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{projet.client_name}</p>
                  </div>
                  <span className={`px-2.5 py-1 text-[11px] font-medium rounded-full shrink-0 ${STATUT_COLORS[projet.statut]}`}>
                    {STATUTS.find((s) => s.value === projet.statut)?.label}
                  </span>
                </div>

                {isOpen && (
                  <div className="px-5 pb-5 pt-0 border-t border-border space-y-4 mt-0">
                    <div className="grid grid-cols-2 gap-4 pt-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Statut</label>
                        <CustomSelect
                          value={edit.statut}
                          options={STATUTS.map((s) => ({ value: s.value, label: s.label }))}
                          onChange={(v) => setEdits((p) => ({ ...p, [projet.id]: { ...p[projet.id], statut: v as Projet["statut"] } }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Titre</label>
                        <input
                          type="text"
                          value={edit.titre ?? ""}
                          onChange={(e) => setEdits((p) => ({ ...p, [projet.id]: { ...p[projet.id], titre: e.target.value } }))}
                          className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10 transition"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Date de début</label>
                        <input type="date" value={edit.date_debut ?? ""} onChange={(e) => setEdits((p) => ({ ...p, [projet.id]: { ...p[projet.id], date_debut: e.target.value } }))} className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10 transition" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Date de fin prévue</label>
                        <input type="date" value={edit.date_fin_prevue ?? ""} onChange={(e) => setEdits((p) => ({ ...p, [projet.id]: { ...p[projet.id], date_fin_prevue: e.target.value } }))} className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10 transition" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Description</label>
                      <textarea
                        value={edit.description ?? ""}
                        onChange={(e) => setEdits((p) => ({ ...p, [projet.id]: { ...p[projet.id], description: e.target.value } }))}
                        rows={2}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-foreground/10 transition"
                      />
                    </div>
                    {isDirty(projet) && (
                      <button onClick={() => handleSave(projet)} disabled={saving === projet.id} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-foreground text-background rounded-xl hover:bg-foreground/90 transition-colors disabled:opacity-50">
                        {saving === projet.id ? <Loader2 size={13} className="animate-spin" /> : savedId === projet.id ? <Check size={13} /> : null}
                        {savedId === projet.id ? "Sauvegardé" : "Enregistrer"}
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

export default ClientsProjets;
