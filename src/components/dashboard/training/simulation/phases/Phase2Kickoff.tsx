import { useState } from "react";
import { Loader2, MessageSquare, FileText, Copy, Check, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ChatPanel from "../ChatPanel";
import type { TrainingBrief, ChatMessage, ClientMode } from "@/lib/training-types";

interface Props {
  brief: TrainingBrief;
  chatHistory: ChatMessage[];
  clientMode: ClientMode;
  sessionId: string | null;
  onNewMessage: (msg: ChatMessage) => void;
  onSubmit: (response: string) => void;
  loading?: boolean;
}

export default function Phase2Kickoff({
  brief,
  chatHistory,
  clientMode,
  sessionId,
  onNewMessage,
  onSubmit,
  loading = false,
}: Props) {
  const [notes, setNotes] = useState("");
  const [copied, setCopied] = useState(false);

  const clientUrl = sessionId
    ? `${window.location.origin}/training/client?session=${sessionId}`
    : null;

  const handleCopy = () => {
    if (!clientUrl) return;
    navigator.clipboard.writeText(clientUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const noteSection = (
    <div className="flex flex-col h-full gap-3">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-1">
          <FileText size={14} className="text-primary" />
          <p className="text-sm font-medium text-foreground">Compte-rendu de réunion</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Rédigez un CR structuré : périmètre validé, décisions prises, prochaines étapes.
        </p>
      </div>
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Compte-rendu de la réunion de lancement&#10;&#10;Présents : ...&#10;Périmètre validé : ...&#10;Décisions : ...&#10;Prochaines étapes : ..."
        className="flex-1 min-h-[200px] text-sm"
        disabled={loading}
      />
      <div className="flex justify-end">
        <Button
          onClick={() => onSubmit(notes)}
          disabled={notes.trim().length < 30 || loading}
          className="gap-2"
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          Soumettre le CR
        </Button>
      </div>
    </div>
  );

  const chatSection = (
    <div className="flex flex-col h-full gap-3">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-1">
          <MessageSquare size={14} className="text-primary" />
          <p className="text-sm font-medium text-foreground">
            Phase 2 — Réunion de lancement
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Échangez avec <strong className="text-foreground">{brief.contact}</strong> pour clarifier
          le périmètre, identifier les livrables et anticiper les risques.
        </p>
        {clientMode === "member" && clientUrl && (
          <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-muted/40 border border-border">
            <Users size={13} className="text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground truncate flex-1">{clientUrl}</p>
            <Button size="sm" variant="outline" onClick={handleCopy} className="shrink-0 gap-1.5 text-xs h-7">
              {copied ? <Check size={11} /> : <Copy size={11} />}
              {copied ? "Copié" : "Copier"}
            </Button>
          </div>
        )}
      </div>
      <div className="flex-1 rounded-xl border border-border overflow-hidden min-h-[300px]">
        <ChatPanel
          messages={chatHistory}
          brief={brief}
          clientMode={clientMode}
          sessionId={sessionId}
          onNewMessage={onNewMessage}
        />
      </div>
    </div>
  );

  return (
    <div>
      {/* Large screens: side by side */}
      <div className="hidden lg:grid lg:grid-cols-2 lg:gap-4 lg:h-[560px]">
        {chatSection}
        {noteSection}
      </div>

      {/* Mobile: tabs */}
      <div className="lg:hidden">
        <Tabs defaultValue="chat">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="chat" className="flex-1 gap-1.5">
              <MessageSquare size={13} /> Conversation
            </TabsTrigger>
            <TabsTrigger value="cr" className="flex-1 gap-1.5">
              <FileText size={13} /> Compte-rendu
            </TabsTrigger>
          </TabsList>
          <TabsContent value="chat" className="h-[400px]">
            {chatSection}
          </TabsContent>
          <TabsContent value="cr">
            {noteSection}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
