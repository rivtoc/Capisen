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

interface GenerateMailBody {
  contact: ContactInfo;
  template: TemplateInfo;
  offres: OffreInfo[];
  context: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Clé API Anthropic non configurée." });
  }

  const { contact, template, offres, context } = req.body as GenerateMailBody;

  if (!contact || !template) {
    return res.status(400).json({ error: "Contact et template sont requis." });
  }

  const offresText =
    offres && offres.length > 0
      ? offres
          .map((o) => `- ${o.title}${o.description ? ` : ${o.description}` : ""}`)
          .join("\n")
      : "Aucune offre sélectionnée.";

  const prompt = `Tu es chargé de rédiger un mail professionnel au nom de Capisen, la Junior-Entreprise de l'ISEN Brest.

**Informations sur le contact :**
- Nom : ${contact.full_name}
- Entreprise : ${contact.company ?? "Non renseignée"}
- Poste : ${contact.job_title ?? "Non renseigné"}
- Email : ${contact.email ?? "Non renseigné"}

**Type de mail : ${template.title}**
${template.context ? `Instructions spécifiques : ${template.context}` : ""}

**Offres / Prestations à mettre en avant :**
${offresText}

**Contexte supplémentaire :**
${context || "Aucun contexte supplémentaire."}

Rédige maintenant le mail complet, bien structuré, avec :
1. L'objet du mail (préfixé par "Objet : ")
2. La formule d'ouverture personnalisée
3. Le corps du message, professionnel et adapté au contact
4. La formule de clôture et la signature "L'équipe Capisen"

Le mail doit être en français, professionnel mais accessible, et donner envie de répondre.`;

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
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.json() as { error?: { message?: string } };
      return res.status(500).json({ error: err.error?.message ?? "Erreur API Anthropic." });
    }

    const data = await response.json() as { content?: Array<{ text: string }> };
    const mail = data.content?.[0]?.text ?? "";
    return res.status(200).json({ mail });
  } catch (err) {
    console.error("generate-mail error:", err);
    return res.status(500).json({ error: "Erreur lors de la génération du mail." });
  }
}
