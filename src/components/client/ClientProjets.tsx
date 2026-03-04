import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar, ChevronDown, ChevronRight } from "lucide-react";

interface Projet {
  id: string;
  titre: string;
  description: string | null;
  statut: "en_cours" | "en_attente" | "termine" | "annule";
  date_debut: string | null;
  date_fin_prevue: string | null;
}

const STATUT_CONFIG = {
  en_cours:   { label: "En cours",    className: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300" },
  en_attente: { label: "En attente",  className: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300" },
  termine:    { label: "Terminé",     className: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300" },
  annule:     { label: "Annulé",      className: "bg-muted text-muted-foreground" },
};

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—";

const ClientProjets = () => {
  const { clientRecord } = useAuth();
  const [projets, setProjets] = useState<Projet[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!clientRecord) return;
    supabase
      .from("client_projets")
      .select("*")
      .eq("client_id", clientRecord.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => { setProjets((data as Projet[]) ?? []); setLoading(false); });
  }, [clientRecord]);

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Mes projets</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Suivi de vos projets en cours avec Capisen.</p>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Chargement…</div>
      ) : projets.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">Aucun projet pour l'instant.</div>
      ) : (
        <div className="space-y-3">
          {projets.map((projet) => {
            const cfg = STATUT_CONFIG[projet.statut] ?? STATUT_CONFIG.en_attente;
            const isOpen = expanded === projet.id;
            return (
              <div key={projet.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : projet.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-muted/20 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{projet.titre}</p>
                    {(projet.date_debut || projet.date_fin_prevue) && (
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
                        <Calendar size={11} />
                        <span>{formatDate(projet.date_debut)} → {formatDate(projet.date_fin_prevue)}</span>
                      </div>
                    )}
                  </div>
                  <span className={`px-2.5 py-1 text-[11px] font-medium rounded-full shrink-0 ${cfg.className}`}>
                    {cfg.label}
                  </span>
                  {isOpen ? <ChevronDown size={14} className="text-muted-foreground shrink-0" /> : <ChevronRight size={14} className="text-muted-foreground shrink-0" />}
                </button>
                {isOpen && projet.description && (
                  <div className="px-5 pb-4 pt-0 border-t border-border">
                    <p className="text-sm text-muted-foreground leading-relaxed mt-3">{projet.description}</p>
                  </div>
                )}
                {isOpen && !projet.description && (
                  <div className="px-5 pb-4 pt-0 border-t border-border">
                    <p className="text-sm text-muted-foreground italic mt-3">Aucune description renseignée.</p>
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

export default ClientProjets;
