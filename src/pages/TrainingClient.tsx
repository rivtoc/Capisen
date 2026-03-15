import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Send, Loader2, Users, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import type { ChatMessage, TrainingBrief } from "@/lib/training-types";

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "http://localhost:3001";

export default function TrainingClient() {
  const [params] = useSearchParams();
  const sessionId = params.get("session");

  const [brief, setBrief] = useState<TrainingBrief | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSession = async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`${SERVER_URL}/api/training/session/${sessionId}`);
      if (!res.ok) throw new Error(`Session introuvable (${res.status})`);
      const data = await res.json();
      setBrief(data.brief);
      setMessages(data.messages ?? []);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      setError("Aucun identifiant de session fourni.");
      return;
    }
    fetchSession();
    intervalRef.current = setInterval(fetchSession, 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending || !sessionId) return;
    setSending(true);
    setInput("");
    try {
      await fetch(`${SERVER_URL}/api/training/session/${sessionId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "client", content: text }),
      });
      // Optimistic update
      setMessages((prev) => [
        ...prev,
        { role: "client", content: text, timestamp: new Date().toISOString() },
      ]);
    } catch {
      setError("Erreur lors de l'envoi du message");
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!sessionId || (error && !brief)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-sm w-full text-center space-y-3">
          <AlertTriangle size={32} className="mx-auto text-amber-500" />
          <p className="text-sm font-medium text-foreground">Session introuvable</p>
          <p className="text-xs text-muted-foreground">
            {error || "Ce lien de simulation est invalide ou a expiré."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-4 py-3 bg-card shrink-0">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
            <Users size={14} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Simulation CAPISEN — Rôle : Client
            </p>
            {brief && (
              <p className="text-xs text-muted-foreground">
                {brief.contact} · {brief.client}
              </p>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full p-4 gap-4 min-h-0">
        {/* Brief context */}
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : brief ? (
          <div className="rounded-xl border border-border bg-card p-4 space-y-2 shrink-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Votre rôle
            </p>
            <p className="text-sm text-foreground">
              Vous jouez le rôle de{" "}
              <strong>{brief.contact}</strong> de <strong>{brief.client}</strong>.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong>Contexte :</strong> {brief.contexte}
            </p>
            <p className="text-xs text-muted-foreground">
              <strong>Problématique :</strong> {brief.problematique}
            </p>
          </div>
        ) : null}

        {/* Chat */}
        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {messages.length === 0 && !loading && (
            <p className="text-xs text-muted-foreground text-center py-8">
              En attente du Suiveur d'Étude…
            </p>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "client" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                  msg.role === "client"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                }`}
              >
                {msg.role === "suiveur" && (
                  <p className="text-[10px] font-semibold opacity-60 mb-0.5">Suiveur d'Étude</p>
                )}
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}

        {/* Input */}
        <div className="flex gap-2 shrink-0">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Répondez en tant que client…"
            className="min-h-[60px] max-h-[120px] text-sm resize-none"
            disabled={sending}
          />
          <Button
            size="icon"
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="shrink-0 self-end"
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </Button>
        </div>
      </div>
    </div>
  );
}
