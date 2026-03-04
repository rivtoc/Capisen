import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Download, Loader2 } from "lucide-react";

interface Facture {
  id: string;
  reference: string;
  montant: number;
  statut: "en_attente" | "payee" | "en_retard" | "annulee";
  date_emission: string;
  date_echeance: string | null;
  document_url: string | null;
  projet_titre: string;
}

const STATUT_CONFIG = {
  en_attente: { label: "En attente",  className: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300" },
  payee:      { label: "Payée",       className: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300" },
  en_retard:  { label: "En retard",   className: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300" },
  annulee:    { label: "Annulée",     className: "bg-muted text-muted-foreground" },
};

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR") : "—";

const formatMontant = (m: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(m);

const ClientFactures = () => {
  const { clientRecord } = useAuth();
  const [factures, setFactures] = useState<Facture[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    if (!clientRecord) return;
    supabase
      .from("client_factures")
      .select("id, reference, montant, statut, date_emission, date_echeance, document_url, client_projets!inner(titre, client_id)")
      .eq("client_projets.client_id", clientRecord.id)
      .order("date_emission", { ascending: false })
      .then(({ data }) => {
        setFactures(
          (data ?? []).map((f: any) => ({ ...f, projet_titre: f.client_projets?.titre ?? "—" }))
        );
        setLoading(false);
      });
  }, [clientRecord]);

  const handleDownload = async (facture: Facture) => {
    if (!facture.document_url) return;
    setDownloading(facture.id);
    window.open(facture.document_url, "_blank");
    setDownloading(null);
  };

  const totalEnAttente = factures
    .filter((f) => f.statut === "en_attente")
    .reduce((sum, f) => sum + f.montant, 0);

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Facturation</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Historique de vos factures.</p>
      </div>

      {totalEnAttente > 0 && (
        <div className="mb-6 px-5 py-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl">
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
            Montant en attente de règlement : {formatMontant(totalEnAttente)}
          </p>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground">Chargement…</div>
      ) : factures.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">Aucune facture.</div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {/* En-tête */}
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-border">
            {["Référence", "Montant", "Émission", "Échéance", "Statut"].map((h) => (
              <p key={h} className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</p>
            ))}
          </div>

          {factures.map((facture, i) => {
            const cfg = STATUT_CONFIG[facture.statut] ?? STATUT_CONFIG.en_attente;
            return (
              <div
                key={facture.id}
                className={`grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-5 py-3.5 ${
                  i < factures.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{facture.reference}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{facture.projet_titre}</p>
                </div>
                <p className="text-sm font-semibold text-foreground whitespace-nowrap">{formatMontant(facture.montant)}</p>
                <p className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(facture.date_emission)}</p>
                <p className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(facture.date_echeance)}</p>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 text-[11px] font-medium rounded-full whitespace-nowrap ${cfg.className}`}>
                    {cfg.label}
                  </span>
                  {facture.document_url && (
                    <button
                      onClick={() => handleDownload(facture)}
                      disabled={downloading === facture.id}
                      className="p-1.5 text-muted-foreground/50 hover:text-foreground hover:bg-muted/60 rounded-lg transition-colors"
                      title="Télécharger"
                    >
                      {downloading === facture.id
                        ? <Loader2 size={13} className="animate-spin" />
                        : <Download size={13} />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ClientFactures;
