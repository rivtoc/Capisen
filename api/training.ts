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
  const lines: string[] = [
    `Client : ${brief.client} (${brief.secteur})`,
    brief.prestation ? `Prestation : ${brief.prestation}` : '',
    `Contact : ${brief.contact}`,
    ``,
    `Contexte : ${brief.contexte}`,
    ``,
    `Problématique : ${brief.problematique}`,
    ``,
    `Objectifs :`,
    ...(brief.objectifs ?? []).map((o) => `  - ${o}`),
    ``,
    `Cahier des charges :`,
    ...brief.cahier_des_charges.map((c) => `  - ${c}`),
    ``,
    `Contraintes :`,
    ...(brief.contraintes ?? []).map((c) => `  - ${c}`),
    ``,
    `Ressources mises à disposition par le client : ${brief.ressources_client ?? 'N/A'}`,
    ``,
    `Critères de succès :`,
    ...(brief.criteres_succes ?? []).map((c) => `  - ${c}`),
    ``,
    `Budget : ${brief.budget_jeh} JEH`,
    `Durée : ${brief.duree_semaines} semaines`,
    `Type de livrable : ${brief.type_livrable}`,
    `Complexité : ${brief.complexite}`,
  ];
  return lines.filter((l) => l !== null && l !== undefined).join('\n').trim();
}

export function registerTrainingRoutes(
  app: Express,
  openai: OpenAI,
  sessions: Map<string, MultiplayerSession>
) {
  // POST /api/training/generate-brief
  app.post('/api/training/generate-brief', async (req, res) => {
    const { offres, prestations, complexite } = req.body as {
      offres: { titre: string; description: string | null }[];
      prestations: { titre: string; description: string | null; offre: string }[];
      complexite: string;
    };

    const offresLines = offres
      .map((o) => `- "${o.titre}"${o.description ? ` : ${o.description}` : ''}`)
      .join('\n');

    const prestationsLines = prestations.length > 0
      ? `\nPrestations ciblées :\n${prestations
          .map((p) => `- "${p.titre}" (offre: ${p.offre})${p.description ? ` : ${p.description}` : ''}`)
          .join('\n')}`
      : '';

    const secteurLabel = offres.map((o) => o.titre).join(' + ');
    const prestationLabel = prestations.length > 0 ? prestations.map((p) => p.titre).join(' + ') : null;

    const transversal = offres.length > 1
      ? ' Le besoin est transversal : construis une problématique qui fait appel à ces plusieurs domaines.'
      : '';

    const systemPrompt =
      `Tu es un simulateur pédagogique pour CAPISEN (Junior-Entreprise de l'ISEN Brest/Toulon). ` +
      `CAPISEN propose des études dans les domaines suivants :\n${offresLines}${prestationsLines}\n` +
      `Génère un brief client fictif réaliste et cohérent avec ces offres${prestations.length > 0 ? ' et prestations' : ''}.${transversal} ` +
      `Difficulté : débutant=client coopératif/périmètre clair, intermédiaire=quelques ambiguïtés, expert=scope creep possible/client exigeant. ` +
      `Réponds UNIQUEMENT en JSON valide.`;

    try {
      const completion = await openai.chat.completions.create({
        model: MODEL,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Génère un brief client COMPLET et DÉTAILLÉ pour les offres CAPISEN "${secteurLabel}"${prestationLabel ? `, prestations "${prestationLabel}"` : ''}, difficulté "${complexite}".

IMPORTANT : chaque champ doit être riche et précis, comme un vrai brief client en Junior-Entreprise. Pas de phrases génériques ou d'une seule ligne.

Réponds avec ce JSON exact (respecte strictement les types) :
{
  "client": "Nom réaliste d'une entreprise fictive (PME, startup ou grand groupe selon contexte)",
  "secteur": "${secteurLabel}",
  "prestation": ${prestationLabel ? `"${prestationLabel}"` : 'null'},
  "contact": "Prénom Nom, Titre précis (ex: Responsable Marketing Digital, CTO, DG)",
  "contexte": "3 à 5 phrases décrivant l'entreprise : son activité, sa taille, son marché, sa situation actuelle, et pourquoi elle fait appel à une Junior-Entreprise maintenant",
  "problematique": "2 à 3 phrases expliquant le problème concret, ses causes, et pourquoi il est urgent ou stratégique pour le client",
  "objectifs": [
    "Objectif précis 1 (ex: Augmenter le taux de conversion de 15% en 6 mois)",
    "Objectif précis 2",
    "Objectif précis 3",
    "Objectif précis 4 (optionnel)"
  ],
  "cahier_des_charges": [
    "Livrable 1 détaillé (ex: Audit complet de la stratégie SEO actuelle avec recommandations priorisées)",
    "Livrable 2 détaillé",
    "Livrable 3 détaillé",
    "Livrable 4 détaillé (optionnel)"
  ],
  "contraintes": [
    "Contrainte 1 (ex: Budget limité à 20 JEH, impossible d'augmenter)",
    "Contrainte 2 (ex: Délai impératif : présentation au CA le 15 mars)",
    "Contrainte 3 (ex: Accès aux données restreint, accord DPO nécessaire)",
    "Contrainte 4 (optionnel)"
  ],
  "ressources_client": "Ce que le client met à disposition : accès aux outils, interlocuteurs disponibles, données existantes, documentations, etc. (2-3 phrases)",
  "criteres_succes": [
    "Critère mesurable 1 (ex: Dashboard opérationnel et validé par l'équipe technique)",
    "Critère mesurable 2",
    "Critère mesurable 3"
  ],
  "budget_jeh": 18,
  "duree_semaines": 10,
  "type_livrable": "informatique",
  "complexite": "${complexite}",
  "pieges": [
    "Piège ou difficulté cachée 1 que le Suiveur devra gérer (ex: client qui élargit le scope en cours de mission)",
    "Piège ou difficulté cachée 2"
  ]
}`,
          },
        ],
        max_tokens: 2000,
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
