import type { VercelRequest, VercelResponse } from "@vercel/node";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

// ─── Inline types (mirror of src/lib/training-types.ts) ──────────────────────
interface TrainingBrief {
  client: string;
  secteur: string;
  contact: string;
  contexte: string;
  problematique: string;
  cahier_des_charges: string[];
  budget_jeh: number;
  duree_semaines: number;
  type_livrable: string;
  complexite: string;
  pieges: string[];
}

interface ChatMessage {
  role: "suiveur" | "client";
  content: string;
  timestamp: string;
}

type PhaseNumber = 1 | 2 | 3 | 4 | 5;

// ─── Constants ────────────────────────────────────────────────────────────────
const MODEL = "gpt-4o";

const PHASE_LABELS: Record<PhaseNumber, string> = {
  1: "Prise de contact",
  2: "Réunion de lancement (Kickoff)",
  3: "Suivi de mission",
  4: "Livraison du livrable",
  5: "Clôture de l'étude",
};

const PHASE_CONTEXT: Record<PhaseNumber, string> = {
  1: "Rédaction du premier email de prise de contact avec le client.",
  2: "Conduite de la réunion de lancement et rédaction du compte-rendu.",
  3: "Email de suivi à mi-parcours de la mission.",
  4: "Email de présentation et livraison du livrable au client.",
  5: "Email de clôture de l'étude avec bilan, validation et aspects administratifs.",
};

function briefToText(brief: TrainingBrief): string {
  return `Client : ${brief.client} (${brief.secteur})
Contact : ${brief.contact}
Contexte : ${brief.contexte}
Problématique : ${brief.problematique}
Cahier des charges : ${brief.cahier_des_charges.join(", ")}
Budget : ${brief.budget_jeh} JEH
Durée : ${brief.duree_semaines} semaines
Type de livrable : ${brief.type_livrable}
Complexité : ${brief.complexite}`.trim();
}

// ─── Supabase client for session storage ─────────────────────────────────────
function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase non configuré");
  return createClient(url, key);
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }

  const segments = Array.isArray(req.query.path)
    ? req.query.path
    : req.query.path
    ? [req.query.path]
    : [];
  const route = segments.join("/");

  const openaiKey = (process.env.OPENAI_API_KEY || "").trim();

  try {
    // ── generate-brief ────────────────────────────────────────────────────────
    if (route === "generate-brief" && req.method === "POST") {
      if (!openaiKey) return res.status(500).json({ error: "OPENAI_API_KEY non configuré" });
      const openai = new OpenAI({ apiKey: openaiKey });
      const { secteur, complexite } = req.body as { secteur: string; complexite: string };
      const completion = await openai.chat.completions.create({
        model: MODEL,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Tu es un simulateur pédagogique pour CAPISEN (Junior-Entreprise de l'ISEN Brest). Génère un brief client fictif réaliste. Réponds UNIQUEMENT en JSON valide. Difficulté : débutant=client coopératif/périmètre clair, intermédiaire=quelques ambiguïtés, expert=scope creep possible/client exigeant.",
          },
          {
            role: "user",
            content: `Génère un brief client fictif pour le secteur "${secteur}" avec une difficulté "${complexite}". Réponds avec ce JSON exact :
{
  "client": "Nom de l'entreprise fictive",
  "secteur": "${secteur}",
  "contact": "Prénom Nom, Titre",
  "contexte": "Description du contexte de l'entreprise",
  "problematique": "Problème concret à résoudre",
  "cahier_des_charges": ["livrable 1", "livrable 2", "livrable 3"],
  "budget_jeh": 15,
  "duree_semaines": 8,
  "type_livrable": "informatique",
  "complexite": "${complexite}",
  "pieges": ["piège ou difficulté potentielle 1", "piège ou difficulté potentielle 2"]
}`,
          },
        ],
        max_tokens: 800,
      });
      const brief = JSON.parse(completion.choices[0].message.content || "{}") as TrainingBrief;
      return res.json(brief);
    }

    // ── generate-scenario ─────────────────────────────────────────────────────
    if (route === "generate-scenario" && req.method === "POST") {
      if (!openaiKey) return res.status(500).json({ error: "OPENAI_API_KEY non configuré" });
      const openai = new OpenAI({ apiKey: openaiKey });
      const { type, brief } = req.body as { type: string; brief: TrainingBrief };
      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: "system",
            content:
              "Tu es un formateur en gestion d'études pour Junior-Entreprises (CAPISEN/CNJE). Génère des scénarios de crise pédagogiques réalistes et instructifs.",
          },
          {
            role: "user",
            content: `Brief de l'étude :\n${briefToText(brief)}\n\nGénère un scénario de crise de type "${type}" en 3-4 phrases. Le scénario doit être précis, situé dans le contexte de l'étude ci-dessus, et poser un défi réaliste au Suiveur d'Étude.`,
          },
        ],
        max_tokens: 300,
      });
      const description = completion.choices[0].message.content || "";
      return res.json({ description });
    }

    // ── evaluate-phase ────────────────────────────────────────────────────────
    if (route === "evaluate-phase" && req.method === "POST") {
      if (!openaiKey) return res.status(500).json({ error: "OPENAI_API_KEY non configuré" });
      const openai = new OpenAI({ apiKey: openaiKey });
      const { phaseNumber, brief, response, chatHistory } = req.body as {
        phaseNumber: PhaseNumber;
        brief: TrainingBrief;
        response: string;
        chatHistory?: ChatMessage[];
      };
      const chatContext =
        chatHistory && chatHistory.length > 0
          ? `\n\nHistorique de la conversation de lancement :\n${chatHistory
              .map((m) => `[${m.role === "suiveur" ? "Suiveur" : "Client"}] ${m.content}`)
              .join("\n")}`
          : "";
      const completion = await openai.chat.completions.create({
        model: MODEL,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Tu es un formateur expert en gestion d'études pour Junior-Entreprises (CNJE/CAPISEN). Sois précis, pédagogique et constructif. Réponds UNIQUEMENT en JSON valide.",
          },
          {
            role: "user",
            content: `Brief de l'étude :\n${briefToText(brief)}${chatContext}\n\nPhase évaluée : Phase ${phaseNumber} — ${PHASE_LABELS[phaseNumber]}\nContexte : ${PHASE_CONTEXT[phaseNumber]}\n\nRéponse de l'étudiant :\n${response}\n\nÉvalue cette réponse et réponds avec ce JSON exact (note sur 10) :
{
  "note": 7,
  "verdict": "Une phrase résumant la performance",
  "criteres": [
    {"nom": "Professionnalisme", "points": 2, "feedback": "..."},
    {"nom": "Clarté et structure", "points": 2, "feedback": "..."},
    {"nom": "Maîtrise du contexte JE", "points": 1, "feedback": "..."},
    {"nom": "Pertinence du contenu", "points": 1, "feedback": "..."},
    {"nom": "Forme et orthographe", "points": 1, "feedback": "..."}
  ],
  "reponse_ideale": "Ce qu'aurait dû contenir la réponse idéale (3-5 phrases)",
  "point_fort": "Ce qui a été bien fait",
  "a_ameliorer": "Ce qui doit être amélioré en priorité"
}`,
          },
        ],
        max_tokens: 800,
      });
      const evaluation = JSON.parse(completion.choices[0].message.content || "{}");
      return res.json(evaluation);
    }

    // ── evaluate-scenario ─────────────────────────────────────────────────────
    if (route === "evaluate-scenario" && req.method === "POST") {
      if (!openaiKey) return res.status(500).json({ error: "OPENAI_API_KEY non configuré" });
      const openai = new OpenAI({ apiKey: openaiKey });
      const { brief, scenario, response } = req.body as {
        brief: TrainingBrief;
        scenario: { type: string; description: string };
        response: string;
      };
      const completion = await openai.chat.completions.create({
        model: MODEL,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Tu es un formateur expert en gestion de crise pour Junior-Entreprises (CNJE/CAPISEN). Sois précis, pédagogique et constructif. Réponds UNIQUEMENT en JSON valide.",
          },
          {
            role: "user",
            content: `Brief de l'étude :\n${briefToText(brief)}\n\nScénario de crise (type: ${scenario.type}) :\n${scenario.description}\n\nRéponse de l'étudiant :\n${response}\n\nÉvalue la gestion de cette crise et réponds avec ce JSON exact :
{
  "note": 7,
  "verdict": "Une phrase résumant la gestion de la crise",
  "criteres": [
    {"nom": "Réactivité et sang-froid", "points": 2, "feedback": "..."},
    {"nom": "Communication avec le client", "points": 2, "feedback": "..."},
    {"nom": "Solution proposée", "points": 2, "feedback": "..."},
    {"nom": "Respect des process JE", "points": 2, "feedback": "..."},
    {"nom": "Anticipation des conséquences", "points": 2, "feedback": "..."}
  ],
  "reponse_ideale": "Comment gérer cette crise idéalement (3-5 phrases)",
  "point_fort": "Ce qui a été bien géré",
  "a_ameliorer": "Ce qui doit être amélioré en priorité"
}`,
          },
        ],
        max_tokens: 800,
      });
      const evaluation = JSON.parse(completion.choices[0].message.content || "{}");
      return res.json(evaluation);
    }

    // ── chat-client ───────────────────────────────────────────────────────────
    if (route === "chat-client" && req.method === "POST") {
      if (!openaiKey) return res.status(500).json({ error: "OPENAI_API_KEY non configuré" });
      const openai = new OpenAI({ apiKey: openaiKey });
      const { brief, chatHistory, newMessage } = req.body as {
        brief: TrainingBrief;
        chatHistory: ChatMessage[];
        newMessage: string;
      };
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: `Tu joues le rôle de ${brief.contact} de ${brief.client}. Tu es un vrai dirigeant, pas une IA. Réponds naturellement, avec le caractère de quelqu'un qui a des attentes précises. Ne sors jamais du personnage. Ne valide pas les mauvaises pratiques sans les souligner. Contexte de l'étude : ${brief.contexte}. Problématique : ${brief.problematique}.`,
        },
        ...chatHistory.map((m) => ({
          role: (m.role === "suiveur" ? "user" : "assistant") as "user" | "assistant",
          content: m.content,
        })),
        { role: "user", content: newMessage },
      ];
      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages,
        max_tokens: 400,
      });
      const reply = completion.choices[0].message.content || "";
      return res.json({ reply });
    }

    // ── session/create ────────────────────────────────────────────────────────
    if (route === "session/create" && req.method === "POST") {
      const supabase = getSupabase();
      const { brief } = req.body as { brief: TrainingBrief };
      const { data, error } = await supabase
        .from("training_multiplayer_sessions")
        .insert({ brief, messages: [] })
        .select("id")
        .single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ sessionId: data.id });
    }

    // ── session/:id (GET) ─────────────────────────────────────────────────────
    if (segments[0] === "session" && segments.length === 2 && req.method === "GET") {
      const supabase = getSupabase();
      const id = segments[1];
      const { data, error } = await supabase
        .from("training_multiplayer_sessions")
        .select("brief, messages")
        .eq("id", id)
        .single();
      if (error || !data) return res.status(404).json({ error: "Session introuvable" });
      return res.json({ brief: data.brief, messages: data.messages });
    }

    // ── session/:id/message (POST) ────────────────────────────────────────────
    if (
      segments[0] === "session" &&
      segments.length === 3 &&
      segments[2] === "message" &&
      req.method === "POST"
    ) {
      const supabase = getSupabase();
      const id = segments[1];
      const { role, content } = req.body as { role: "suiveur" | "client"; content: string };

      // Fetch current messages, append, update
      const { data: session, error: fetchErr } = await supabase
        .from("training_multiplayer_sessions")
        .select("messages")
        .eq("id", id)
        .single();
      if (fetchErr || !session) return res.status(404).json({ error: "Session introuvable" });

      const newMessage: ChatMessage = {
        role,
        content,
        timestamp: new Date().toISOString(),
      };
      const updated = [...(session.messages as ChatMessage[]), newMessage];

      const { error: updateErr } = await supabase
        .from("training_multiplayer_sessions")
        .update({ messages: updated, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (updateErr) return res.status(500).json({ error: updateErr.message });
      return res.json({ ok: true });
    }

    return res.status(404).json({ error: "Route non trouvée" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return res.status(500).json({ error: message });
  }
}
