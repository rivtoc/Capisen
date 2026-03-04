import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Send } from "lucide-react";

interface Projet { id: string; titre: string; }
interface Message { id: string; content: string; sent_at: string; is_from_client: boolean; sender_name?: string; }

const ClientMessages = () => {
  const { clientRecord, user } = useAuth();
  const [projets, setProjets] = useState<Projet[]>([]);
  const [selectedProjet, setSelectedProjet] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!clientRecord) return;
    supabase
      .from("client_projets")
      .select("id, titre")
      .eq("client_id", clientRecord.id)
      .order("created_at")
      .then(({ data }) => {
        setProjets((data as Projet[]) ?? []);
        if (data && data.length > 0) setSelectedProjet(data[0].id);
        setLoading(false);
      });
  }, [clientRecord]);

  useEffect(() => {
    if (!selectedProjet) return;
    setMessages([]);
    supabase
      .from("client_messages")
      .select("id, content, sent_at, is_from_client")
      .eq("projet_id", selectedProjet)
      .order("sent_at")
      .then(({ data }) => setMessages((data as Message[]) ?? []));

    const channel = supabase
      .channel(`messages:${selectedProjet}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "client_messages",
        filter: `projet_id=eq.${selectedProjet}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedProjet]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedProjet || !user) return;
    setSending(true);
    await supabase.from("client_messages").insert({
      projet_id: selectedProjet,
      sender_id: user.id,
      content: newMessage.trim(),
      is_from_client: true,
    });
    setNewMessage("");
    setSending(false);
  };

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Chargement…</div>;

  if (projets.length === 0) {
    return (
      <div className="p-8 max-w-3xl">
        <h1 className="text-xl font-bold text-foreground mb-2">Messagerie</h1>
        <p className="text-sm text-muted-foreground">Aucun projet disponible pour échanger.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header avec sélecteur de projet */}
      <div className="px-6 py-4 border-b border-border shrink-0">
        <h1 className="text-base font-bold text-foreground mb-2">Messagerie</h1>
        <div className="flex gap-2 flex-wrap">
          {projets.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedProjet(p.id)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                selectedProjet === p.id
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.titre}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground pt-8">Aucun message. Démarrez la conversation !</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.is_from_client ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
                  msg.is_from_client
                    ? "bg-foreground text-background rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                }`}
              >
                <p>{msg.content}</p>
                <p className={`text-[10px] mt-1 ${msg.is_from_client ? "text-background/50" : "text-muted-foreground"}`}>
                  {new Date(msg.sent_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-border shrink-0">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Votre message…"
            className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/40 transition"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="p-2.5 bg-foreground text-background rounded-xl hover:bg-foreground/90 transition-colors disabled:opacity-40"
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientMessages;
