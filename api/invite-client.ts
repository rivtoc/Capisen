import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Non autorisé." });
  }
  const token = authHeader.slice(7);

  const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Vérifier que l'appelant est membre pôle étude ou présidence
  const { data: { user: callerUser } } = await supabaseAdmin.auth.getUser(token);
  if (!callerUser) return res.status(401).json({ error: "Token invalide." });

  const { data: callerProfile } = await supabaseAdmin
    .from("profiles")
    .select("pole")
    .eq("id", callerUser.id)
    .single();

  if (!callerProfile || !["etude", "presidence"].includes(callerProfile.pole)) {
    return res.status(403).json({ error: "Accès réservé aux pôles Étude et Présidence." });
  }

  const { email, full_name, company_name } = req.body as {
    email: string;
    full_name: string;
    company_name?: string;
  };

  if (!email || !full_name) {
    return res.status(400).json({ error: "L'email et le nom sont requis." });
  }

  try {
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: { is_client: true, full_name, company_name: company_name ?? "" },
        redirectTo: `${process.env.VITE_APP_URL ?? "https://capisen.fr"}/login`,
      }
    );

    if (inviteError) {
      return res.status(500).json({ error: inviteError.message });
    }

    const { error: insertError } = await supabaseAdmin
      .from("clients")
      .insert({
        id: inviteData.user.id,
        full_name,
        email,
        company_name: company_name ?? "",
        created_by: callerUser.id,
      });

    if (insertError) {
      return res.status(500).json({ error: "Invitation envoyée mais enregistrement échoué : " + insertError.message });
    }

    return res.status(200).json({ success: true, client_id: inviteData.user.id });
  } catch (err) {
    console.error("invite-client error:", err);
    return res.status(500).json({ error: "Erreur interne lors de l'invitation." });
  }
}
