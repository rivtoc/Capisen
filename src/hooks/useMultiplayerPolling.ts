import { useState, useEffect, useRef, useCallback } from "react";
import type { ChatMessage, TrainingBrief } from "@/lib/training-types";

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "http://localhost:3001";

interface PollResult {
  messages: ChatMessage[];
  brief: TrainingBrief | null;
  loading: boolean;
  error: string | null;
  stop: () => void;
}

export function useMultiplayerPolling(
  sessionId: string | null,
  enabled: boolean
): PollResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [brief, setBrief] = useState<TrainingBrief | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stoppedRef = useRef(false);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!sessionId || !enabled) return;
    stoppedRef.current = false;

    const poll = async () => {
      if (stoppedRef.current) return;
      try {
        const res = await fetch(`${SERVER_URL}/api/training/session/${sessionId}`);
        if (!res.ok) throw new Error(`Erreur ${res.status}`);
        const data = await res.json();
        setMessages(data.messages ?? []);
        setBrief(data.brief ?? null);
        setError(null);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erreur de connexion");
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    poll();
    intervalRef.current = setInterval(poll, 3000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [sessionId, enabled]);

  return { messages, brief, loading, error, stop };
}
