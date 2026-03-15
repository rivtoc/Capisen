import { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ChatMessage, TrainingBrief, ClientMode } from "@/lib/training-types";

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "http://localhost:3001";

interface Props {
  messages: ChatMessage[];
  brief: TrainingBrief;
  clientMode: ClientMode;
  sessionId: string | null;
  onNewMessage: (msg: ChatMessage) => void;
}

export default function ChatPanel({
  messages,
  brief,
  clientMode,
  sessionId,
  onNewMessage,
}: Props) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const suiveurMsg: ChatMessage = {
      role: "suiveur",
      content: text,
      timestamp: new Date().toISOString(),
    };
    onNewMessage(suiveurMsg);
    setInput("");
    setError(null);

    if (clientMode === "ai") {
      setLoading(true);
      try {
        const res = await fetch(`${SERVER_URL}/api/training/chat-client`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brief,
            chatHistory: messages,
            newMessage: text,
          }),
        });
        if (!res.ok) throw new Error(`Erreur ${res.status}`);
        const data = await res.json();
        const clientMsg: ChatMessage = {
          role: "client",
          content: data.reply,
          timestamp: new Date().toISOString(),
        };
        onNewMessage(clientMsg);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erreur lors de la communication");
      } finally {
        setLoading(false);
      }
    } else if (clientMode === "member" && sessionId) {
      // Post to multiplayer session
      try {
        await fetch(`${SERVER_URL}/api/training/session/${sessionId}/message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "suiveur", content: text }),
        });
      } catch {
        // Message already added locally, server post is best-effort
      }
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">
            Commencez la conversation avec {brief.contact}
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "suiveur" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                msg.role === "suiveur"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted text-foreground rounded-bl-sm"
              }`}
            >
              {msg.role === "client" && (
                <p className="text-[10px] font-semibold opacity-60 mb-0.5">{brief.contact}</p>
              )}
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-xl rounded-bl-sm px-3 py-2">
              <Loader2 size={14} className="animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-500 px-3 pb-1">{error}</p>
      )}

      {/* Input */}
      <div className="border-t border-border p-2 flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Votre message…"
          className="min-h-[60px] max-h-[120px] text-sm resize-none"
          disabled={loading}
        />
        <Button
          size="icon"
          onClick={sendMessage}
          disabled={!input.trim() || loading}
          className="shrink-0 self-end"
        >
          <Send size={14} />
        </Button>
      </div>
    </div>
  );
}
