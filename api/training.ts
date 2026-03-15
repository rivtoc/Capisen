import type { Express } from 'express';
import type OpenAI from 'openai';
import type {
  TrainingBrief,
  PhaseEvaluation,
  ChatMessage,
  MultiplayerSession,
  PhaseNumber,
} from '../src/lib/training-types.js';

const MODEL = 'gpt-4o';

const PHASE_LABELS: Record<PhaseNumber, string> = {
  1: 'Prise de contact',
  2: 'Réunion de lancement (Kickoff)',
  3: 'Suivi de mission',
  4: 'Livraison du livrable',
  5: 'Clôture de l\'étude',
};

const PHASE_CONTEXT: Record<PhaseNumber, string> = {
  1: 'Rédaction du premier email de prise de contact avec le client.',
  2: 'Conduite de la réunion de lancement et rédaction du compte-rendu.',
  3: 'Email de suivi à mi-parcours de la mission.',
  4: 'Email de présentation et livraison du livrable au client.',
  5: 'Email de clôture de l\'étude avec bilan, validation et aspects administratifs.',
};

function briefToText(brief: TrainingBrief): string {
  return `
Client : ${brief.client} (${brief.secteur})
Contact : ${brief.contact}
Contexte : ${brief.contexte}
Problématique : ${brief.problematique}
Cahier des charges : ${brief.cahier_des_charges.join(', ')}
Budget : ${brief.budget_jeh} JEH
Durée : ${brief.duree_semaines} semaines
Type de livrable : ${brief.type_livrable}
Complexité : ${brief.complexite}
`.trim();
}

export function registerTrainingRoutes(
  app: Express,
  openai: OpenAI,
  sessions: Map<string, MultiplayerSession>
) {
  // POST /api/training/generate-brief
  app.post('/api/training/generate-brief', async (req, res) => {
    const { secteur, complexite } = req.body as { secteur: string; complexite: string };
    try {
      const completion = await openai.chat.completions.create({
        model: MODEL,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'Tu es un simulateur pédagogique pour CAPISEN (Junior-Entreprise de l\'ISEN Brest). Génère un brief client fictif réaliste. Réponds UNIQUEMENT en JSON valide. Difficulté : débutant=client coopératif/périmètre clair, intermédiaire=quelques ambiguïtés, expert=scope creep possible/client exigeant.',
          },
          {
            role: 'user',
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
      const brief = JSON.parse(completion.choices[0].message.content || '{}') as TrainingBrief;
      res.json(brief);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      res.status(500).json({ error: message });
    }
  });

  // POST /api/training/generate-scenario
  app.post('/api/training/generate-scenario', async (req, res) => {
    const { type, brief } = req.body as { type: string; brief: TrainingBrief };
    try {
      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content:
              'Tu es un formateur en gestion d\'études pour Junior-Entreprises (CAPISEN/CNJE). Génère des scénarios de crise pédagogiques réalistes et instructifs.',
          },
          {
            role: 'user',
            content: `Brief de l'étude :\n${briefToText(brief)}\n\nGénère un scénario de crise de type "${type}" en 3-4 phrases. Le scénario doit être précis, situé dans le contexte de l'étude ci-dessus, et poser un défi réaliste au Suiveur d'Étude.`,
          },
        ],
        max_tokens: 300,
      });
      const description = completion.choices[0].message.content || '';
      res.json({ description });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      res.status(500).json({ error: message });
    }
  });

  // POST /api/training/evaluate-phase
  app.post('/api/training/evaluate-phase', async (req, res) => {
    const { phaseNumber, brief, response, chatHistory } = req.body as {
      phaseNumber: PhaseNumber;
      brief: TrainingBrief;
      response: string;
      chatHistory?: ChatMessage[];
    };
    try {
      const chatContext =
        chatHistory && chatHistory.length > 0
          ? `\n\nHistorique de la conversation de lancement :\n${chatHistory
              .map((m) => `[${m.role === 'suiveur' ? 'Suiveur' : 'Client'}] ${m.content}`)
              .join('\n')}`
          : '';

      const completion = await openai.chat.completions.create({
        model: MODEL,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'Tu es un formateur expert en gestion d\'études pour Junior-Entreprises (CNJE/CAPISEN). Sois précis, pédagogique et constructif. Réponds UNIQUEMENT en JSON valide.',
          },
          {
            role: 'user',
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
      const evaluation = JSON.parse(
        completion.choices[0].message.content || '{}'
      ) as PhaseEvaluation;
      res.json(evaluation);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      res.status(500).json({ error: message });
    }
  });

  // POST /api/training/evaluate-scenario
  app.post('/api/training/evaluate-scenario', async (req, res) => {
    const { brief, scenario, response } = req.body as {
      brief: TrainingBrief;
      scenario: { type: string; description: string };
      response: string;
    };
    try {
      const completion = await openai.chat.completions.create({
        model: MODEL,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'Tu es un formateur expert en gestion de crise pour Junior-Entreprises (CNJE/CAPISEN). Sois précis, pédagogique et constructif. Réponds UNIQUEMENT en JSON valide.',
          },
          {
            role: 'user',
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
      const evaluation = JSON.parse(
        completion.choices[0].message.content || '{}'
      ) as PhaseEvaluation;
      res.json(evaluation);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      res.status(500).json({ error: message });
    }
  });

  // POST /api/training/chat-client
  app.post('/api/training/chat-client', async (req, res) => {
    const { brief, chatHistory, newMessage } = req.body as {
      brief: TrainingBrief;
      chatHistory: ChatMessage[];
      newMessage: string;
    };
    try {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: `Tu joues le rôle de ${brief.contact} de ${brief.client}. Tu es un vrai dirigeant, pas une IA. Réponds naturellement, avec le caractère de quelqu'un qui a des attentes précises. Ne sors jamais du personnage. Ne valide pas les mauvaises pratiques sans les souligner. Contexte de l'étude : ${brief.contexte}. Problématique : ${brief.problematique}.`,
        },
        ...chatHistory.map((m) => ({
          role: (m.role === 'suiveur' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user', content: newMessage },
      ];

      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages,
        max_tokens: 400,
      });
      const reply = completion.choices[0].message.content || '';
      res.json({ reply });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      res.status(500).json({ error: message });
    }
  });

  // POST /api/training/session/create
  app.post('/api/training/session/create', (req, res) => {
    const { brief } = req.body as { brief: TrainingBrief };
    const id = crypto.randomUUID();
    const session: MultiplayerSession = {
      id,
      brief,
      messages: [],
      createdAt: new Date(),
      lastActivity: new Date(),
    };
    sessions.set(id, session);
    res.json({ sessionId: id });
  });

  // GET /api/training/session/:id
  app.get('/api/training/session/:id', (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session introuvable' });
    res.json({ brief: session.brief, messages: session.messages });
  });

  // POST /api/training/session/:id/message
  app.post('/api/training/session/:id/message', (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session introuvable' });
    const { role, content } = req.body as { role: 'suiveur' | 'client'; content: string };
    const message: ChatMessage = {
      role,
      content,
      timestamp: new Date().toISOString(),
    };
    session.messages.push(message);
    session.lastActivity = new Date();
    res.json({ ok: true });
  });
}
