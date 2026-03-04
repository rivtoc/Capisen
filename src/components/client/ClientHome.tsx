import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { FolderOpen, FileText, MessageSquare, Receipt, ArrowRight } from "lucide-react";

interface Stats {
  projetsActifs: number;
  totalDocuments: number;
  messagesNonLus: number;
  facturesEnAttente: number;
}

const ClientHome = ({ setActiveView }: { setActiveView: (v: string) => void }) => {
  const { clientRecord } = useAuth();
  const [stats, setStats] = useState<Stats>({ projetsActifs: 0, totalDocuments: 0, messagesNonLus: 0, facturesEnAttente: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [{ data: projets }, { data: docs }, { data: factures }] = await Promise.all([
        supabase.from("client_projets").select("id, statut").eq("client_id", clientRecord!.id),
        supabase.from("client_documents").select("id, projet_id, client_projets!inner(client_id)").eq("client_projets.client_id", clientRecord!.id),
        supabase.from("client_factures").select("id, statut, client_projets!inner(client_id)").eq("client_projets.client_id", clientRecord!.id),
      ]);

      setStats({
        projetsActifs: projets?.filter((p) => p.statut === "en_cours").length ?? 0,
        totalDocuments: docs?.length ?? 0,
        messagesNonLus: 0,
        facturesEnAttente: factures?.filter((f) => f.statut === "en_attente").length ?? 0,
      });
      setLoading(false);
    };

    if (clientRecord) fetchStats();
  }, [clientRecord]);

  const cards = [
    { label: "Projets en cours",       value: stats.projetsActifs,     icon: <FolderOpen size={20} />,    view: "projets",   color: "text-blue-600 dark:text-blue-400",   bg: "bg-blue-50 dark:bg-blue-500/10" },
    { label: "Documents disponibles",  value: stats.totalDocuments,    icon: <FileText size={20} />,      view: "documents", color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-500/10" },
    { label: "Messages",               value: stats.messagesNonLus,    icon: <MessageSquare size={20} />, view: "messages",  color: "text-green-600 dark:text-green-400",  bg: "bg-green-50 dark:bg-green-500/10" },
    { label: "Factures en attente",    value: stats.facturesEnAttente, icon: <Receipt size={20} />,       view: "factures",  color: "text-amber-600 dark:text-amber-400",  bg: "bg-amber-50 dark:bg-amber-500/10" },
  ];

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          Bonjour, {clientRecord?.full_name?.split(" ")[0] ?? "—"} 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Voici un résumé de votre espace {clientRecord?.company_name ? `— ${clientRecord.company_name}` : ""}.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Chargement…</div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) => (
            <button
              key={card.view}
              onClick={() => setActiveView(card.view)}
              className="bg-card border border-border rounded-2xl p-5 text-left hover:shadow-md transition-all group"
            >
              <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center mb-4 ${card.color}`}>
                {card.icon}
              </div>
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
              <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">
                <span>Voir</span>
                <ArrowRight size={11} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientHome;
