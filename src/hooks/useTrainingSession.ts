import { useState, useCallback } from "react";
import type { TrainingSession } from "@/lib/training-types";

const STORAGE_KEY = "capisen_training_session";

const defaultSession = (): TrainingSession => ({
  mode: null,
  clientMode: "ai",
  multiplayerSessionId: null,
  memberClientName: null,
  brief: null,
  currentPhase: 1,
  responses: {},
  evaluations: {},
  chatHistory: [],
  scenario: null,
  scenarioResponse: null,
  scenarioEvaluation: null,
  startedAt: new Date().toISOString(),
});

function loadSession(): TrainingSession {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSession();
    return JSON.parse(raw) as TrainingSession;
  } catch {
    return defaultSession();
  }
}

export function useTrainingSession() {
  const [session, setSession] = useState<TrainingSession>(loadSession);

  const updateSession = useCallback((partial: Partial<TrainingSession>) => {
    setSession((prev) => {
      const next = { ...prev, ...partial };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  const clearSession = useCallback(() => {
    const fresh = defaultSession();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setSession(fresh);
  }, []);

  return { session, updateSession, clearSession };
}
