import type { VercelRequest, VercelResponse } from "@vercel/node";

interface ContactInfo {
  full_name: string;
  company: string | null;
  job_title: string | null;
  email: string | null;
  notes?: string | null;
}

interface TemplateInfo {
  title: string;
  context: string | null;
}

interface OffreInfo {
  title: string;
  description: string | null;
}

type Message = { role: "user" | "assistant"; content: string };

interface SenderInfo {
  full_name: string;
  role: string;
  pole: string;
}

interface InitialBody {
  contact?: ContactInfo;
  contacts?: ContactInfo[];
  contentType?: string;
  template: TemplateInfo;
  offres: OffreInfo[];
  context: string;
  mentionedContacts?: ContactInfo[];
  sender?: SenderInfo;
}

interface RefinementBody {
  messages: Message[];
  refinement: string;
}

// Persona + règles de ton — strictes
const SYSTEM_PROMPT = `Tu es l'assistant de rédaction de Capisen, la Junior-Entreprise de l'ISEN Brest.

RÈGLES IMPÉRATIVES — à respecter absolument :
- Sois direct, concis et naturel. Zéro phrase de remplissage.
- INTERDIT d'utiliser ces formules ou leurs variantes : "J'espère que ce message vous trouve en bonne santé", "Je me permets de vous contacter", "N'hésitez pas à revenir vers moi", "Dans l'espoir d'une suite favorable", "Restant à votre disposition", "En espérant une réponse favorable", "Je me tiens à votre disposition", "N'hésitez pas à me contacter".
- Copie le style et la structure du template fourni — c'est ta référence principale pour le ton et la formulation.
- Chaque texte a un seul objectif clair. Va droit au but dès les premières lignes.
- Si on te demande de modifier un texte existant, fournis directement le texte corrigé et complet, sans explication ni commentaire autour.`;

const POLE_LABELS: Record<string, string> = {
  secretariat: "Secrétariat", tresorerie: "Trésorerie", rh_event: "RH & Événements",
  communication: "Communication", etude: "Étude", qualite: "Qualité", presidence: "Présidence",
};

const ROLE_LABELS: Record<string, string> = {
  normal: "Membre", responsable: "Responsable", presidence: "Présidence",
};

// Instructions finales de génération selon le type de contenu
const GENERATION_INSTRUCTIONS: Record<string, string> = {
  mail_client: `Rédige le mail avec :
1. L'objet du mail (préfixé par "Objet : ")
2. Une ouverture directe — pas de formule vide
3. Le corps : clair, concis, un seul objectif par mail
4. Une clôture courte et une signature "Capisen"`,

  mail_partenariat: `Rédige le mail avec :
1. L'objet du mail (préfixé par "Objet : ")
2. Une ouverture directe sur la raison du contact
3. Le corps : ce qu'on propose, pourquoi ça a du sens, quelle suite on suggère
4. Une clôture courte et une signature "Capisen"`,

  mail_relance: `Rédige le mail de relance avec :
1. L'objet du mail (préfixé par "Objet : ")
2. Une phrase de contexte rapide (rappel du mail précédent, sans s'excuser)
3. La relance directe : qu'est-ce qu'on attend comme suite ?
4. Une clôture courte et une signature "Capisen"`,

  linkedin_message: `Rédige le message LinkedIn avec :
- Pas d'objet, pas de formule d'ouverture pompeuse
- 3 à 5 phrases maximum, ton direct et humain
- Un appel à l'action clair en fin de message`,

  linkedin_post: `Rédige le post LinkedIn avec :
- Une accroche forte en première ligne (pas de question banale type "Vous êtes-vous déjà demandé ?")
- Corps aéré avec retours à la ligne, 150 à 250 mots max
- Un appel à l'action ou une question ouverte en conclusion
- Pas de formule d'ouverture, pas de signature formelle`,
};

function buildInitialPrompt(body: InitialBody): string {
  const { contact, contacts, contentType, template, offres, context, mentionedContacts, sender } = body;

  const recipients: ContactInfo[] =
    contacts && contacts.length > 0 ? contacts : contact ? [contact] : [];

  const isPost = contentType === "linkedin_post";

  const offresText =
    offres && offres.length > 0
      ? offres.map((o) => `- ${o.title}${o.description ? ` : ${o.description}` : ""}`).join("\n")
      : "Aucune offre sélectionnée.";

  const mentionedText =
    mentionedContacts && mentionedContacts.length > 0
      ? mentionedContacts
          .map((c) => {
            const parts = [`- ${c.full_name}`];
            if (c.job_title) parts.push(`Poste : ${c.job_title}`);
            if (c.company) parts.push(`Entreprise : ${c.company}`);
            if (c.email) parts.push(`Email : ${c.email}`);
            return parts.join(", ");
          })
          .join("\n")
      : null;

  const senderBlock = sender
    ? `**Expéditeur (toi) :**
- Nom : ${sender.full_name}
- Rôle au sein de Capisen : ${ROLE_LABELS[sender.role] ?? sender.role}
- Pôle : ${POLE_LABELS[sender.pole] ?? sender.pole}
Signe le texte avec ton prénom ou ton nom complet selon le niveau de formalité.

`
    : "";

  let recipientBlock = "";
  if (!isPost && recipients.length > 0) {
    if (recipients.length === 1) {
      const c = recipients[0];
      recipientBlock = `**Contact destinataire :**
- Nom : ${c.full_name}
- Entreprise : ${c.company ?? "Non renseignée"}
- Poste : ${c.job_title ?? "Non renseigné"}
- Email : ${c.email ?? "Non renseigné"}${c.notes ? `\n- Notes : ${c.notes}` : ""}

`;
    } else {
      recipientBlock = `**Contacts destinataires (${recipients.length} personnes) :**
${recipients
  .map((c) => {
    const details = [c.job_title, c.company].filter(Boolean).join(", ");
    return `- ${c.full_name}${details ? ` (${details})` : ""}`;
  })
  .join("\n")}
Adresse le texte à tous les destinataires de façon appropriée.

`;
    }
  }

  const generationInstructions =
    GENERATION_INSTRUCTIONS[contentType ?? "mail_client"] ?? GENERATION_INSTRUCTIONS["mail_client"];

  return `${senderBlock}${recipientBlock}**Template : ${template.title}**
${template.context ? `Instructions du template : ${template.context}\n` : ""}
**Offres / Prestations à mettre en avant :**
${offresText}

**Contexte supplémentaire :**
${context || "Aucun contexte supplémentaire."}
${mentionedText ? `\n**Profils des personnes mentionnées :**\n${mentionedText}\n(Utilise ces informations si pertinentes.)` : ""}
${generationInstructions}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Clé API Anthropic non configurée." });

  const body = req.body as InitialBody | RefinementBody;

  let messages: Message[];

  if ("messages" in body && Array.isArray(body.messages)) {
    if (!body.refinement?.trim()) {
      return res.status(400).json({ error: "Message de raffinement manquant." });
    }
    messages = [...body.messages, { role: "user", content: body.refinement }];
  } else {
    const initial = body as InitialBody;
    const isPost = initial.contentType === "linkedin_post";
    const hasContact = (initial.contacts && initial.contacts.length > 0) || initial.contact;
    if ((!hasContact && !isPost) || !initial.template) {
      return res.status(400).json({ error: "Contact et template sont requis." });
    }
    messages = [{ role: "user", content: buildInitialPrompt(initial) }];
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-6",
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.json() as { error?: { message?: string } };
      return res.status(500).json({ error: err.error?.message ?? "Erreur API Anthropic." });
    }

    const data = await response.json() as { content?: Array<{ text: string }> };
    const mail = data.content?.[0]?.text ?? "";

    const updatedMessages: Message[] = [...messages, { role: "assistant", content: mail }];
    return res.status(200).json({ mail, messages: updatedMessages });

  } catch (err) {
    console.error("generate-mail error:", err);
    return res.status(500).json({ error: "Erreur lors de la génération du mail." });
  }
}
