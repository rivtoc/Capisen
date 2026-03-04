import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Search } from "lucide-react";

interface Client {
  id: string;
  full_name: string;
  email: string;
  company_name: string;
  is_active: boolean;
  created_at: string;
}

const ClientsListe = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("clients")
      .select("id, full_name, email, company_name, is_active, created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => { setClients((data as Client[]) ?? []); setLoading(false); });
  }, []);

  const handleToggleActive = async (client: Client) => {
    setToggling(client.id);
    const { error } = await supabase
      .from("clients")
      .update({ is_active: !client.is_active })
      .eq("id", client.id);
    if (!error) {
      setClients((prev) => prev.map((c) => c.id === client.id ? { ...c, is_active: !c.is_active } : c));
    }
    setToggling(null);
  };

  const filtered = clients.filter((c) =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.company_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">Clients</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Liste de tous les clients enregistrés.</p>
      </div>

      <div className="relative max-w-xs mb-5">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Rechercher…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/40 transition"
        />
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Chargement…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Aucun client trouvé.</div>
      ) : (
        <div className="space-y-2">
          {/* En-têtes */}
          <div className="flex items-center gap-4 px-5 pb-1">
            <div className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Client</div>
            <div className="w-52 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Email</div>
            <div className="w-32 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Inscrit le</div>
            <div className="w-24 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Statut</div>
          </div>

          {filtered.map((client) => (
            <div
              key={client.id}
              className={`flex items-center gap-4 px-5 py-3 rounded-xl border transition-colors ${
                client.is_active
                  ? "border-border bg-card"
                  : "border-border bg-muted/30 opacity-60"
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{client.full_name}</p>
                {client.company_name && (
                  <p className="text-[11px] text-muted-foreground truncate">{client.company_name}</p>
                )}
              </div>
              <p className="w-52 text-sm text-muted-foreground truncate">{client.email}</p>
              <p className="w-32 text-sm text-muted-foreground">
                {new Date(client.created_at).toLocaleDateString("fr-FR")}
              </p>
              <div className="w-24 flex items-center">
                <button
                  onClick={() => handleToggleActive(client)}
                  disabled={toggling === client.id}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors ${
                    client.is_active
                      ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300 hover:bg-green-200"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {client.is_active ? "Actif" : "Inactif"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-4">
        {filtered.length} client{filtered.length !== 1 ? "s" : ""}{search ? " trouvé" + (filtered.length !== 1 ? "s" : "") : " au total"}
      </p>
    </div>
  );
};

export default ClientsListe;
