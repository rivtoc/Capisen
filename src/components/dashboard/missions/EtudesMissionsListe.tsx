import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { btn, field } from "@/lib/ui-classes";
import {
  Check, ChevronDown, Download, FileText, Loader2,
  Plus, Trash2, Upload, UserPlus, X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MissionDoc {
  id: string;
  mission_id: string;
  name: string;
  file_url: string;
}

interface MissionIntervenant {
  intervenant_id: string;
  profiles: { id: string; full_name: string; avatar_url: string | null };
}

interface Mission {
  id: string;
  title: string;
  reference: string | null;
  instructions: string | null;
  status: string;
  created_at: string;
  mission_documents: MissionDoc[];
  mission_intervenants: MissionIntervenant[];
}

interface Intervenant {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "en_cours", label: "En cours" },
  { value: "termine",  label: "Terminée" },
  { value: "annule",   label: "Annulée" },
];

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  en_cours: { label: "En cours", className: "status-en-cours" },
  termine:  { label: "Terminée", className: "status-termine"  },
  annule:   { label: "Annulée",  className: "bg-muted text-muted-foreground" },
};

// ─── Composant ────────────────────────────────────────────────────────────────

const EtudesMissionsListe = () => {
  const { user } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [intervenants, setIntervenants] = useState<Intervenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Création
  const [creating, setCreating] = useState(false);
  const [newForm, setNewForm] = useState({ title: "", instructions: "", status: "en_cours" });
  const [newIntervenants, setNewIntervenants] = useState<string[]>([]);
  const [newDocuments, setNewDocuments] = useState<File[]>([]);
  const [createLoading, setCreateLoading] = useState(false);
  const newDocInputRef = useRef<HTMLInputElement | null>(null);

  // Edition instructions (par mission)
  const [instructionsEdit, setInstructionsEdit] = useState<Record<string, string>>({});
  const [savingInstructions, setSavingInstructions] = useState<Record<string, boolean>>({});
  const [savedInstructions, setSavedInstructions] = useState<Record<string, boolean>>({});

  // Documents
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [deletingDoc, setDeletingDoc] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Intervenants (par mission)
  const [addingIntervenant, setAddingIntervenant] = useState<Record<string, boolean>>({});
  const [selectedIntervenant, setSelectedIntervenant] = useState<Record<string, string>>({});

  // Suppression mission
  const [deletingMission, setDeletingMission] = useState<string | null>(null);
  const [deleteMissionLoading, setDeleteMissionLoading] = useState<string | null>(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const [missionsRes, intervenantsRes] = await Promise.all([
      supabase
        .from("missions")
        .select("*, mission_documents(*), mission_intervenants(intervenant_id, profiles!intervenant_id(id, full_name, avatar_url))")
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("pole", "intervenant")
        .order("full_name"),
    ]);
    setMissions((missionsRes.data as Mission[]) ?? []);
    setIntervenants((intervenantsRes.data as Intervenant[]) ?? []);
    setLoading(false);
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    const mission = missions.find((m) => m.id === id);
    if (mission && instructionsEdit[id] === undefined) {
      setInstructionsEdit((p) => ({ ...p, [id]: mission.instructions ?? "" }));
    }
  };

  // ── Création ────────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!newForm.title.trim() || !user) return;
    setCreateLoading(true);
    const { data, error } = await supabase
      .from("missions")
      .insert({
        title:        newForm.title.trim(),
        instructions: newForm.instructions.trim() || null,
        status:       newForm.status,
        created_by:   user.id,
      })
      .select()
      .single();
    if (error || !data) { setCreateLoading(false); return; }

    // Associer les intervenants sélectionnés
    if (newIntervenants.length > 0) {
      await supabase.from("mission_intervenants").insert(
        newIntervenants.map((id) => ({ mission_id: data.id, intervenant_id: id }))
      );
    }

    // Uploader les documents
    const uploadedDocs: MissionDoc[] = [];
    for (const file of newDocuments) {
      const path = `${data.id}/${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage.from("mission-docs").upload(path, file);
      if (!uploadErr) {
        const { data: docData } = await supabase
          .from("mission_documents")
          .insert({ mission_id: data.id, name: file.name, file_url: path })
          .select()
          .single();
        if (docData) uploadedDocs.push(docData as MissionDoc);
      }
    }

    // Construire la mission locale
    const missionIntervenants = newIntervenants
      .map((id) => intervenants.find((i) => i.id === id))
      .filter(Boolean)
      .map((i) => ({ intervenant_id: i!.id, profiles: i! }));

    setMissions((prev) => [{
      ...data,
      mission_documents: uploadedDocs,
      mission_intervenants: missionIntervenants,
    } as Mission, ...prev]);
    setNewForm({ title: "", instructions: "", status: "en_cours" });
    setNewIntervenants([]);
    setNewDocuments([]);
    setCreateLoading(false);
    setCreating(false);
  };

  // ── Instructions ────────────────────────────────────────────────────────────

  const handleSaveInstructions = async (missionId: string) => {
    const text = instructionsEdit[missionId] ?? "";
    setSavingInstructions((p) => ({ ...p, [missionId]: true }));
    const { error } = await supabase
      .from("missions")
      .update({ instructions: text || null })
      .eq("id", missionId);
    setSavingInstructions((p) => ({ ...p, [missionId]: false }));
    if (!error) {
      setMissions((p) => p.map((m) => m.id === missionId ? { ...m, instructions: text || null } : m));
      setSavedInstructions((p) => ({ ...p, [missionId]: true }));
      setTimeout(() => setSavedInstructions((p) => ({ ...p, [missionId]: false })), 2000);
    }
  };

  // ── Documents ────────────────────────────────────────────────────────────────

  const handleUpload = async (missionId: string, file: File) => {
    setUploading((p) => ({ ...p, [missionId]: true }));
    const path = `${missionId}/${Date.now()}_${file.name}`;
    const { error: uploadErr } = await supabase.storage.from("mission-docs").upload(path, file);
    if (!uploadErr) {
      const { data: docData } = await supabase
        .from("mission_documents")
        .insert({ mission_id: missionId, name: file.name, file_url: path })
        .select()
        .single();
      if (docData) {
        setMissions((p) => p.map((m) =>
          m.id === missionId
            ? { ...m, mission_documents: [...m.mission_documents, docData as MissionDoc] }
            : m
        ));
      }
    }
    setUploading((p) => ({ ...p, [missionId]: false }));
  };

  const handleDownload = async (path: string, name: string) => {
    setDownloading(path);
    const { data } = await supabase.storage.from("mission-docs").createSignedUrl(path, 3600);
    setDownloading(null);
    if (data?.signedUrl) {
      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = name;
      a.click();
    }
  };

  const handleDeleteDoc = async (missionId: string, doc: MissionDoc) => {
    setDeletingDoc(doc.id);
    await supabase.storage.from("mission-docs").remove([doc.file_url]);
    await supabase.from("mission_documents").delete().eq("id", doc.id);
    setDeletingDoc(null);
    setMissions((p) => p.map((m) =>
      m.id === missionId
        ? { ...m, mission_documents: m.mission_documents.filter((d) => d.id !== doc.id) }
        : m
    ));
  };

  // ── Intervenants ─────────────────────────────────────────────────────────────

  const handleAddIntervenant = async (missionId: string) => {
    const intervenantId = selectedIntervenant[missionId];
    if (!intervenantId) return;
    const { error } = await supabase
      .from("mission_intervenants")
      .insert({ mission_id: missionId, intervenant_id: intervenantId });
    if (!error) {
      const interv = intervenants.find((i) => i.id === intervenantId);
      if (interv) {
        setMissions((p) => p.map((m) =>
          m.id === missionId
            ? { ...m, mission_intervenants: [...m.mission_intervenants, { intervenant_id: intervenantId, profiles: interv }] }
            : m
        ));
      }
    }
    setAddingIntervenant((p) => ({ ...p, [missionId]: false }));
    setSelectedIntervenant((p) => ({ ...p, [missionId]: "" }));
  };

  const handleRemoveIntervenant = async (missionId: string, intervenantId: string) => {
    await supabase.from("mission_intervenants").delete()
      .eq("mission_id", missionId).eq("intervenant_id", intervenantId);
    setMissions((p) => p.map((m) =>
      m.id === missionId
        ? { ...m, mission_intervenants: m.mission_intervenants.filter((i) => i.intervenant_id !== intervenantId) }
        : m
    ));
  };

  // ── Suppression mission ──────────────────────────────────────────────────────

  const handleDeleteMission = async (missionId: string) => {
    setDeleteMissionLoading(missionId);
    await supabase.from("missions").delete().eq("id", missionId);
    setDeleteMissionLoading(null);
    setDeletingMission(null);
    setMissions((p) => p.filter((m) => m.id !== missionId));
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center gap-2 text-muted-foreground text-sm">
        <Loader2 size={16} className="animate-spin" /> Chargement…
      </div>
    );
  }

  return (
    <div className="px-8 py-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground mb-1">Missions</h2>
          <p className="text-sm text-muted-foreground">
            Gérez les missions, instructions, documents et intervenants.
          </p>
        </div>
        {!creating && (
          <button onClick={() => setCreating(true)} className={btn.primary}>
            <Plus size={14} /> Nouvelle mission
          </button>
        )}
      </div>

      {/* ── Formulaire création ── */}
      {creating && (
        <div className="bg-card border border-border rounded-2xl p-6 mb-6 space-y-4">
          <h3 className="font-semibold text-foreground text-sm">Nouvelle mission</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Titre *</label>
              <input
                type="text"
                value={newForm.title}
                onChange={(e) => setNewForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Nom de la mission"
                className={field.input}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Statut</label>
              <select
                value={newForm.status}
                onChange={(e) => setNewForm((p) => ({ ...p, status: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Intervenants */}
          {intervenants.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Intervenants</label>
              <div className="flex flex-wrap gap-1.5">
                {intervenants.map((i) => {
                  const selected = newIntervenants.includes(i.id);
                  return (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => setNewIntervenants((p) =>
                        selected ? p.filter((id) => id !== i.id) : [...p, i.id]
                      )}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                        selected
                          ? "bg-foreground text-background border-foreground"
                          : "bg-card text-muted-foreground border-border hover:border-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full overflow-hidden bg-muted-foreground/20 flex items-center justify-center text-[9px] font-bold shrink-0">
                        {i.avatar_url
                          ? <img src={i.avatar_url} alt="" className="w-full h-full object-cover" />
                          : i.full_name.charAt(0).toUpperCase()}
                      </div>
                      {i.full_name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Instructions</label>
            <textarea
              value={newForm.instructions}
              onChange={(e) => setNewForm((p) => ({ ...p, instructions: e.target.value }))}
              placeholder="Instructions pour les intervenants…"
              rows={3}
              className={field.textarea}
            />
          </div>

          {/* Documents à uploader */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Documents</label>
            {newDocuments.length > 0 && (
              <div className="space-y-1 mb-2">
                {newDocuments.map((f, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-muted/40 border border-border">
                    <FileText size={13} className="text-muted-foreground shrink-0" />
                    <span className="flex-1 text-xs text-foreground truncate">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => setNewDocuments((p) => p.filter((_, i) => i !== idx))}
                      className="text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => newDocInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors"
            >
              <Upload size={14} /> Ajouter un document
            </button>
            <input
              ref={newDocInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setNewDocuments((p) => [...p, file]);
                e.target.value = "";
              }}
            />
          </div>

          <div className="flex items-center gap-3 justify-end">
            <button onClick={() => { setCreating(false); setNewIntervenants([]); setNewDocuments([]); }} className={btn.secondary}>Annuler</button>
            <button
              onClick={handleCreate}
              disabled={!newForm.title.trim() || createLoading}
              className={btn.primary}
            >
              {createLoading ? <Loader2 size={13} className="animate-spin" /> : null}
              Créer
            </button>
          </div>
        </div>
      )}

      {/* ── Liste des missions ── */}
      {missions.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Aucune mission créée. Cliquez sur "Nouvelle mission" pour commencer.
        </div>
      ) : (
        <div className="space-y-3">
          {missions.map((m) => {
            const isExpanded = expanded.has(m.id);
            const status = STATUS_LABELS[m.status] ?? STATUS_LABELS.en_cours;
            const assignedIds = new Set(m.mission_intervenants.map((i) => i.intervenant_id));
            const available = intervenants.filter((i) => !assignedIds.has(i.id));
            const instructionsDirty =
              (instructionsEdit[m.id] ?? m.instructions ?? "") !== (m.instructions ?? "");

            return (
              <div key={m.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                {/* Header */}
                <button
                  onClick={() => toggleExpand(m.id)}
                  className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-semibold text-foreground">{m.title}</span>
                      {m.reference && (
                        <span className="text-xs text-muted-foreground font-mono">{m.reference}</span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${status.className}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {m.mission_intervenants.length} intervenant{m.mission_intervenants.length !== 1 ? "s" : ""} ·{" "}
                      {m.mission_documents.length} document{m.mission_documents.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`text-muted-foreground shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Détails */}
                {isExpanded && (
                  <div className="border-t border-border px-6 py-5 space-y-6">

                    {/* Instructions */}
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Instructions
                      </p>
                      <textarea
                        value={instructionsEdit[m.id] ?? m.instructions ?? ""}
                        onChange={(e) => setInstructionsEdit((p) => ({ ...p, [m.id]: e.target.value }))}
                        rows={4}
                        placeholder="Instructions pour les intervenants…"
                        className={field.textarea}
                      />
                      {(instructionsDirty || savedInstructions[m.id]) && (
                        <div className="flex justify-end mt-2">
                          {savedInstructions[m.id] ? (
                            <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-medium">
                              <Check size={12} /> Sauvegardé
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSaveInstructions(m.id)}
                              disabled={savingInstructions[m.id]}
                              className={btn.primary}
                            >
                              {savingInstructions[m.id] ? <Loader2 size={12} className="animate-spin" /> : null}
                              Enregistrer
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Intervenants */}
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Intervenants
                      </p>
                      <div className="flex flex-wrap gap-2 items-center">
                        {m.mission_intervenants.map((mi) => (
                          <div
                            key={mi.intervenant_id}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted border border-border"
                          >
                            <div className="w-5 h-5 rounded-full bg-muted-foreground/20 flex items-center justify-center text-[10px] font-bold uppercase overflow-hidden shrink-0">
                              {mi.profiles.avatar_url
                                ? <img src={mi.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                                : mi.profiles.full_name.charAt(0)}
                            </div>
                            <span className="text-xs text-foreground">{mi.profiles.full_name}</span>
                            <button
                              onClick={() => handleRemoveIntervenant(m.id, mi.intervenant_id)}
                              className="ml-0.5 text-muted-foreground/60 hover:text-red-500 transition-colors"
                            >
                              <X size={11} />
                            </button>
                          </div>
                        ))}

                        {addingIntervenant[m.id] ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={selectedIntervenant[m.id] ?? ""}
                              onChange={(e) => setSelectedIntervenant((p) => ({ ...p, [m.id]: e.target.value }))}
                              className="text-xs border border-border rounded-lg px-2.5 py-1.5 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
                            >
                              <option value="">— Choisir —</option>
                              {available.map((i) => (
                                <option key={i.id} value={i.id}>{i.full_name}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleAddIntervenant(m.id)}
                              disabled={!selectedIntervenant[m.id]}
                              className="px-2.5 py-1.5 text-xs font-semibold bg-foreground text-background rounded-lg disabled:opacity-40 transition-colors"
                            >
                              Ajouter
                            </button>
                            <button
                              onClick={() => setAddingIntervenant((p) => ({ ...p, [m.id]: false }))}
                              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ) : available.length > 0 ? (
                          <button
                            onClick={() => setAddingIntervenant((p) => ({ ...p, [m.id]: true }))}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors"
                          >
                            <UserPlus size={12} /> Ajouter
                          </button>
                        ) : m.mission_intervenants.length === 0 ? (
                          <span className="text-xs text-muted-foreground italic">Aucun intervenant disponible.</span>
                        ) : null}
                      </div>
                    </div>

                    {/* Documents */}
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Documents
                      </p>
                      <div className="space-y-1.5">
                        {m.mission_documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-border bg-muted/20"
                          >
                            <FileText size={14} className="text-muted-foreground shrink-0" />
                            <span className="flex-1 text-sm text-foreground truncate">{doc.name}</span>
                            <button
                              onClick={() => handleDownload(doc.file_url, doc.name)}
                              disabled={downloading === doc.file_url}
                              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                              title="Télécharger"
                            >
                              {downloading === doc.file_url
                                ? <Loader2 size={13} className="animate-spin" />
                                : <Download size={13} />
                              }
                            </button>
                            <button
                              onClick={() => handleDeleteDoc(m.id, doc)}
                              disabled={deletingDoc === doc.id}
                              className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50"
                              title="Supprimer"
                            >
                              {deletingDoc === doc.id
                                ? <Loader2 size={13} className="animate-spin" />
                                : <Trash2 size={13} />
                              }
                            </button>
                          </div>
                        ))}

                        <button
                          onClick={() => fileInputRefs.current[m.id]?.click()}
                          disabled={uploading[m.id]}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors disabled:opacity-50"
                        >
                          {uploading[m.id]
                            ? <><Loader2 size={14} className="animate-spin" /> Envoi en cours…</>
                            : <><Upload size={14} /> Ajouter un document</>
                          }
                        </button>
                        <input
                          ref={(el) => { fileInputRefs.current[m.id] = el; }}
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUpload(m.id, file);
                            e.target.value = "";
                          }}
                        />
                      </div>
                    </div>

                    {/* Supprimer la mission */}
                    <div className="flex justify-end pt-2 border-t border-border">
                      {deletingMission === m.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Confirmer la suppression ?</span>
                          <button
                            onClick={() => handleDeleteMission(m.id)}
                            disabled={deleteMissionLoading === m.id}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                          >
                            {deleteMissionLoading === m.id ? <Loader2 size={11} className="animate-spin" /> : null}
                            Supprimer
                          </button>
                          <button
                            onClick={() => setDeletingMission(null)}
                            className="px-3 py-1.5 text-xs border border-border rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingMission(m.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-500/60 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 size={12} /> Supprimer la mission
                        </button>
                      )}
                    </div>
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

export default EtudesMissionsListe;
