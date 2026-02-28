import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface MailGeneration {
  id: string;
  created_at: string;
  result: string | null;
  contact: { full_name: string } | null;
  template: { title: string } | null;
}

const MailHistory = () => {
  const [history, setHistory] = useState<MailGeneration[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("mail_generations")
      .select("id, created_at, result, contact:contacts(full_name), template:mail_templates(title)")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setHistory((data as unknown as MailGeneration[]) ?? []);
        setLoading(false);
      });
  }, []);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="p-8 max-w-4xl">
      <h2 className="text-xl font-bold text-foreground mb-1">Historique</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Mails générés par l'IA, du plus récent au plus ancien.
      </p>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Chargement…</div>
      ) : history.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-white border border-gray-200 rounded-2xl">
          <p className="text-sm">Aucun mail généré pour l'instant.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item) => {
            const isOpen = expanded === item.id;
            return (
              <div key={item.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : item.id)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {item.contact?.full_name ?? "Contact inconnu"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.template?.title ?? "Template inconnu"}
                      {" · "}
                      {format(new Date(item.created_at), "d MMM yyyy à HH:mm", { locale: fr })}
                    </p>
                  </div>
                  {isOpen ? (
                    <ChevronUp size={16} className="text-muted-foreground shrink-0 ml-4" />
                  ) : (
                    <ChevronDown size={16} className="text-muted-foreground shrink-0 ml-4" />
                  )}
                </button>

                {isOpen && item.result && (
                  <div className="px-5 pb-5 border-t border-gray-100">
                    <div className="flex justify-end mt-3 mb-2">
                      <button
                        onClick={() => handleCopy(item.id, item.result!)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        {copied === item.id ? <Check size={12} /> : <Copy size={12} />}
                        {copied === item.id ? "Copié !" : "Copier"}
                      </button>
                    </div>
                    <pre className="text-sm text-foreground whitespace-pre-wrap font-sans bg-gray-50 rounded-xl p-4 leading-relaxed">
                      {item.result}
                    </pre>
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

export default MailHistory;
