import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Download, FileText, Loader2 } from "lucide-react";

interface Document {
  id: string;
  nom: string;
  url: string;
  type: string;
  uploaded_at: string;
  projet_id: string;
  projet_titre: string;
}

const TYPE_LABELS: Record<string, string> = {
  contrat: "Contrat", devis: "Devis", livrable: "Livrable", pv: "PV", autre: "Autre",
};

const ClientDocuments = () => {
  const { clientRecord } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    if (!clientRecord) return;
    supabase
      .from("client_documents")
      .select("id, nom, url, type, uploaded_at, projet_id, client_projets!inner(titre, client_id)")
      .eq("client_projets.client_id", clientRecord.id)
      .order("uploaded_at", { ascending: false })
      .then(({ data }) => {
        setDocuments(
          (data ?? []).map((d: any) => ({
            ...d,
            projet_titre: d.client_projets?.titre ?? "—",
          }))
        );
        setLoading(false);
      });
  }, [clientRecord]);

  const handleDownload = async (doc: Document) => {
    setDownloading(doc.id);
    // Le bucket est privé : générer une URL signée de 60 secondes
    const path = doc.url.split("/client-documents/")[1];
    if (path) {
      const { data } = await supabase.storage
        .from("client-documents")
        .createSignedUrl(path, 60);
      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank");
        setDownloading(null);
        return;
      }
    }
    // Fallback : ouvrir l'URL directe
    window.open(doc.url, "_blank");
    setDownloading(null);
  };

  // Grouper par projet
  const grouped = documents.reduce<Record<string, Document[]>>((acc, doc) => {
    const key = doc.projet_titre;
    if (!acc[key]) acc[key] = [];
    acc[key].push(doc);
    return acc;
  }, {});

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Documents</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Documents partagés par l'équipe Capisen.</p>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Chargement…</div>
      ) : documents.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">Aucun document disponible.</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([projetTitre, docs]) => (
            <div key={projetTitre}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{projetTitre}</p>
              <div className="space-y-2">
                {docs.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-4 bg-card border border-border rounded-xl px-4 py-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <FileText size={14} className="text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{doc.nom}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {TYPE_LABELS[doc.type] ?? doc.type} · {new Date(doc.uploaded_at).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDownload(doc)}
                      disabled={downloading === doc.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-lg text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50"
                    >
                      {downloading === doc.id
                        ? <Loader2 size={12} className="animate-spin" />
                        : <Download size={12} />}
                      Télécharger
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientDocuments;
