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

interface InitialBody {
  contact: ContactInfo;
  template: TemplateInfo;
  offres: OffreInfo[];
  context: string;
  mentionedContacts?: ContactInfo[];
}

interface RefinementBody {
  messages: Message[];
  refinement: string;
}

// Persona constante — s'applique à toutes les générations et à tous les raffinements
const SYSTEM_PROMPT = `Tu es l'assistant de rédaction de Capisen, la Junior-Entreprise de l'ISEN Brest.
Tu rédiges des mails professionnels en français, au nom de Capisen.
Quand on te demande de modifier un mail existant, fournis directement le mail révisé et complet, sans explication ni commentaire autour.`;

function buildInitialPrompt(body: InitialBody): string {
  const { contact, template, offres, context, mentionedContacts } = body;

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

  return `**Contact destinataire :**
- Nom : ${contact.full_name}
- Entreprise : ${contact.company ?? "Non renseignée"}
- Poste : ${contact.job_title ?? "Non renseigné"}
- Email : ${contact.email ?? "Non renseigné"}

**Type de mail : ${template.title}**
${template.context ? `Instructions spécifiques : ${template.context}\n` : ""}
**Offres / Prestations à mettre en avant :**
${offresText}

**Contexte supplémentaire :**
${context || "Aucun contexte supplémentaire."}
${mentionedText ? `\n**Profils des personnes mentionnées dans le contexte :**\n${mentionedText}\n(Utilise ces informations si elles sont pertinentes pour personnaliser le mail.)` : ""}
Rédige maintenant le mail complet avec :
1. L'objet du mail (préfixé par "Objet : ")
2. La formule d'ouverture personnalisée
3. Le corps du message, professionnel et adapté au contact
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
    if (!initial.contact || !initial.template) {
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
