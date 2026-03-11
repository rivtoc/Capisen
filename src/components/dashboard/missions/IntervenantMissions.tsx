import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronDown, Download, FileText, Loader2, Plus } from "lucide-react";

interface MissionDoc {
  id: string;
  name: string;
  file_url: string;
}

interface Mission {
  id: string;
  title: string;
  reference: string | null;
  instructions: string | null;
  status: string;
  mission_documents: MissionDoc[];
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  en_cours: { label: "En cours",  className: "status-en-cours" },
  termine:  { label: "Terminée",  className: "status-termine"  },
  annule:   { label: "Annulée",   className: "bg-muted text-muted-foreground" },
};

const IntervenantMissions = () => {
  const { user } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null); // mission_id en cours d'upload
  const uploadRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: assignments } = await supabase
        .from("mission_intervenants")
        .select("mission_id")
        .eq("intervenant_id", user.id);

      const ids = (assignments ?? []).map((a: { mission_id: string }) => a.mission_id);
      if (ids.length === 0) { setLoading(false); return; }

      const { data } = await supabase
        .from("missions")
        .select("*, mission_documents(*)")
        .in("id", ids)
        .order("created_at", { ascending: false });

      setMissions((data as Mission[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
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

  const handleUpload = async (missionId: string, file: File) => {
    if (!user) return;
    setUploading(missionId);
    const path = `${missionId}/${Date.now()}_${file.name}`;
    const { error: uploadErr } = await supabase.storage
      .from("mission-docs")
      .upload(path, file);
    if (uploadErr) { setUploading(null); return; }

    const { data: docData, error: insertErr } = await supabase
      .from("mission_documents")
      .insert({ mission_id: missionId, name: file.name, file_url: path })
      .select()
      .single();
    setUploading(null);
    if (insertErr || !docData) return;

    setMissions((prev) =>
      prev.map((m) =>
        m.id === missionId
          ? { ...m, mission_documents: [...m.mission_documents, docData as MissionDoc] }
          : m
      )
    );
    // Reset input
    if (uploadRefs.current[missionId]) uploadRefs.current[missionId]!.value = "";
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center gap-2 text-muted-foreground text-sm">
        <Loader2 size={16} className="animate-spin" /> Chargement…
      </div>
    );
  }

  return (
    <div className="px-8 py-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground mb-1">Mes missions</h2>
        <p className="text-sm text-muted-foreground">
          Instructions et documents des études sur lesquelles vous intervenez.
        </p>
      </div>

      {missions.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Aucune mission ne vous est assignée pour le moment.
        </div>
      ) : (
        <div className="space-y-3">
          {missions.map((m) => {
            const isExpanded = expanded.has(m.id);
            const status = STATUS_LABELS[m.status] ?? STATUS_LABELS.en_cours;
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
                  <div className="border-t border-border px-6 py-5 space-y-5">
                    {/* Instructions */}
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Instructions
                      </p>
                      {m.instructions ? (
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                          {m.instructions}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Aucune instruction renseignée.</p>
                      )}
                    </div>

                    {/* Documents */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Documents
                        </p>
                        <button
                          onClick={() => uploadRefs.current[m.id]?.click()}
                          disabled={uploading === m.id}
                          className="btn-sm-outline"
                        >
                          {uploading === m.id
                            ? <Loader2 size={11} className="animate-spin" />
                            : <Plus size={11} />
                          }
                          Ajouter un document
                        </button>

                        <input
                          ref={(el) => { uploadRefs.current[m.id] = el; }}
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUpload(m.id, file);
                          }}
                        />
                      </div>

                      {m.mission_documents.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">Aucun document disponible.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {m.mission_documents.map((doc) => (
                            <button
                              key={doc.id}
                              onClick={() => handleDownload(doc.file_url, doc.name)}
                              disabled={downloading === doc.file_url}
                              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-border hover:bg-muted/40 transition-colors text-left disabled:opacity-60"
                            >
                              <FileText size={14} className="text-muted-foreground shrink-0" />
                              <span className="flex-1 text-sm text-foreground truncate">{doc.name}</span>
                              {downloading === doc.file_url
                                ? <Loader2 size={13} className="text-muted-foreground animate-spin shrink-0" />
                                : <Download size={13} className="text-muted-foreground shrink-0" />
                              }
                            </button>
                          ))}
                        </div>
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

export default IntervenantMissions;
