import type { VercelRequest, VercelResponse } from "@vercel/node";

interface ContactInfo {
  full_name: string;
  company: string | null;
  job_title: string | null;
  email: string | null;
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

// Persona constante — s'applique à toutes les générations et à tous les raffinements
const SYSTEM_PROMPT = `Tu es l'assistant de rédaction de Capisen, la Junior-Entreprise de l'ISEN Brest.
Tu rédiges des mails professionnels en français, au nom de Capisen.
Quand on te demande de modifier un mail existant, fournis directement le mail révisé et complet, sans explication ni commentaire autour.`;

const POLE_LABELS: Record<string, string> = {
  secretariat: "Secrétariat", tresorerie: "Trésorerie", rh_event: "RH & Événements",
  communication: "Communication", etude: "Étude", qualite: "Qualité", presidence: "Présidence",
};

const ROLE_LABELS: Record<string, string> = {
  normal: "Membre", responsable: "Responsable", presidence: "Présidence",
};

function buildInitialPrompt(body: InitialBody): string {
  const { contact, contacts, template, offres, context, mentionedContacts, sender } = body;

  // Support both single contact (legacy) and contacts array
  const recipients: ContactInfo[] =
    contacts && contacts.length > 0 ? contacts : contact ? [contact] : [];

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
Signe le mail avec ton prénom ou ton nom complet selon le niveau de formalité, et adapte le ton à ton rôle.

`
    : "";

  let recipientBlock: string;
  if (recipients.length === 1) {
    const c = recipients[0];
    recipientBlock = `**Contact destinataire :**
- Nom : ${c.full_name}
- Entreprise : ${c.company ?? "Non renseignée"}
- Poste : ${c.job_title ?? "Non renseigné"}
- Email : ${c.email ?? "Non renseigné"}`;
  } else {
    recipientBlock = `**Contacts destinataires (${recipients.length} personnes) :**
${recipients
  .map((c) => {
    const details = [c.job_title, c.company].filter(Boolean).join(", ");
    return `- ${c.full_name}${details ? ` (${details})` : ""}`;
  })
  .join("\n")}
Adresse le mail à tous les destinataires de façon appropriée.`;
  }

  return `${senderBlock}${recipientBlock}

**Type de mail : ${template.title}**
${template.context ? `Instructions spécifiques : ${template.context}\n` : ""}
**Offres / Prestations à mettre en avant :**
${offresText}

**Contexte supplémentaire :**
${context || "Aucun contexte supplémentaire."}
${mentionedText ? `\n**Profils des personnes mentionnées dans le contexte :**\n${mentionedText}\n(Utilise ces informations si elles sont pertinentes pour personnaliser le mail.)` : ""}
Rédige maintenant le mail complet avec :
1. L'objet du mail (préfixé par "Objet : ")
2. La formule d'ouverture personnalisée (adaptée à ${recipients.length > 1 ? "plusieurs destinataires" : "ce destinataire"})
3. Le corps du message, professionnel et adapté au(x) contact(s)
4. La formule de clôture et la signature "L'équipe Capisen"

Le mail doit être en français, professionnel mais accessible, et donner envie de répondre.`;
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
    // Mode raffinement — on ajoute la demande de l'utilisateur à l'historique existant
    if (!body.refinement?.trim()) {
      return res.status(400).json({ error: "Message de raffinement manquant." });
    }
    messages = [...body.messages, { role: "user", content: body.refinement }];
  } else {
    // Mode génération initiale — on construit le premier message depuis le contexte
    const initial = body as InitialBody;
    const hasContact = (initial.contacts && initial.contacts.length > 0) || initial.contact;
    if (!hasContact || !initial.template) {
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

    // On retourne le mail + la conversation complète mise à jour
    const updatedMessages: Message[] = [...messages, { role: "assistant", content: mail }];
    return res.status(200).json({ mail, messages: updatedMessages });

  } catch (err) {
    console.error("generate-mail error:", err);
    return res.status(500).json({ error: "Erreur lors de la génération du mail." });
  }
}
