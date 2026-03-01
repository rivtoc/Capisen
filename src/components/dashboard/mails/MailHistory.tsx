import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronDown, ChevronUp, Copy, Check, BookmarkPlus, Loader2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CONTENT_TYPES } from "@/lib/db-types";

interface MailGeneration {
  id: string;
  created_at: string;
  result: string | null;
  content_type: string | null;
  contact: {
    full_name: string;
    email: string | null;
    linkedin_url: string | null;
  } | null;
  template: { title: string } | null;
}

const isLinkedIn = (type: string | null) =>
  type === "linkedin_message" || type === "linkedin_post";

const MailHistory = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState<MailGeneration[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Créer un template depuis l'historique
  const [savingTemplateId, setSavingTemplateId] = useState<string | null>(null);
  const [templateTitleFor, setTemplateTitleFor] = useState<string | null>(null);
  const [templateTitle, setTemplateTitle] = useState("");
  const [savedTemplateId, setSavedTemplateId] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("mail_generations")
      .select(`
        id, created_at, result, content_type,
        contact:contacts(full_name, email, linkedin_url),
        template:mail_templates(title)
      `)
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

  const openCreateTemplate = (item: MailGeneration) => {
    setTemplateTitleFor(item.id);
    setTemplateTitle(item.template?.title ?? "");
    setSavedTemplateId(null);
  };

  const handleSaveTemplate = async (item: MailGeneration) => {
    if (!templateTitle.trim() || !item.result) return;
    setSavingTemplateId(item.id);

    await supabase.from("mail_templates").insert({
      title: templateTitle.trim(),
      type: item.content_type ?? null,
      context: `Exemple de référence (ton et style à reproduire) :\n\n${item.result}`,
      created_by: user?.id ?? null,
    });

    setSavingTemplateId(null);
    setSavedTemplateId(item.id);
    setTemplateTitleFor(null);
    setTemplateTitle("");
    setTimeout(() => setSavedTemplateId(null), 3000);
  };

  const typeLabel = (type: string | null) =>
    CONTENT_TYPES.find((ct) => ct.value === type)?.label ?? null;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h2 className="text-xl font-bold text-foreground mb-1">Historique</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Contenus générés par l'IA, du plus récent au plus ancien.
      </p>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Chargement…</div>
      ) : history.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-white border border-gray-200 rounded-2xl">
          <p className="text-sm">Aucun contenu généré pour l'instant.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item) => {
            const isOpen = expanded === item.id;
            const label = typeLabel(item.content_type);
            const showLinkedIn = isLinkedIn(item.content_type);
            const contactLink = showLinkedIn
              ? item.contact?.linkedin_url
              : item.contact?.email;
            const isCreatingTemplate = templateTitleFor === item.id;
            const isSavedTemplate = savedTemplateId === item.id;

            return (
              <div key={item.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : item.id)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {label && (
                        <span className="text-xs bg-gray-100 text-muted-foreground px-2 py-0.5 rounded-full shrink-0">
                          {label}
                        </span>
                      )}
                      <p className="text-sm font-medium text-foreground truncate">
                        {item.contact?.full_name ?? "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      <p className="text-xs text-muted-foreground">
                        {item.template?.title ?? "Template inconnu"}
                        {" · "}
                        {format(new Date(item.created_at), "d MMM yyyy à HH:mm", { locale: fr })}
                      </p>
                      {contactLink && (
                        <a
                          href={showLinkedIn ? contactLink : `mailto:${contactLink}`}
                          target={showLinkedIn ? "_blank" : undefined}
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                        >
                          <ExternalLink size={10} />
                          {showLinkedIn ? "LinkedIn" : contactLink}
                        </a>
                      )}
                    </div>
                  </div>
                  {isOpen ? (
                    <ChevronUp size={16} className="text-muted-foreground shrink-0 ml-4" />
                  ) : (
                    <ChevronDown size={16} className="text-muted-foreground shrink-0 ml-4" />
                  )}
                </button>

                {isOpen && item.result && (
                  <div className="px-5 pb-5 border-t border-gray-100">
                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3 mb-2 flex-wrap">
                      <button
                        onClick={() => handleCopy(item.id, item.result!)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        {copied === item.id ? <Check size={12} /> : <Copy size={12} />}
                        {copied === item.id ? "Copié !" : "Copier"}
                      </button>

                      {!isCreatingTemplate && !isSavedTemplate && (
                        <button
                          onClick={() => openCreateTemplate(item)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <BookmarkPlus size={12} />
                          Créer un template
                        </button>
                      )}

                      {isSavedTemplate && (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg">
                          <Check size={12} />
                          Template créé !
                        </span>
                      )}
                    </div>

                    {/* Formulaire inline "créer template" */}
                    {isCreatingTemplate && (
                      <div className="flex items-center gap-2 mb-3">
                        <input
                          type="text"
                          value={templateTitle}
                          onChange={(e) => setTemplateTitle(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSaveTemplate(item)}
                          placeholder="Nom du template…"
                          autoFocus
                          className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition"
                        />
                        <button
                          onClick={() => handleSaveTemplate(item)}
                          disabled={!templateTitle.trim() || savingTemplateId === item.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-40 transition-colors"
                        >
                          {savingTemplateId === item.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <BookmarkPlus size={12} />
                          )}
                          Créer
                        </button>
                        <button
                          onClick={() => setTemplateTitleFor(null)}
                          className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Annuler
                        </button>
                      </div>
                    )}

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
