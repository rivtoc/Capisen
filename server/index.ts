import express from 'express';
import cors from 'cors';
import { Resend } from 'resend';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Charger .env (racine projet = parent du dossier server/)
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
if (!process.env.RESEND_API_KEY) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
}
// Éviter espaces / BOM venant du fichier .env
const apiKey = (process.env.RESEND_API_KEY || '').trim();
process.env.RESEND_API_KEY = apiKey || undefined;

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Resend
const resend = new Resend(apiKey);

// Email endpoint
app.post('/api/contact', async (req, res) => {
  try {
    if (!apiKey) {
      return res.status(500).json({ 
        error: 'Erreur lors de l\'envoi de l\'email',
        details: 'Service temporairement indisponible.'
      });
    }

    const { name, email, company, message } = req.body;

    // Validation
    if (!name || !email || !message) {
      return res.status(400).json({ 
        error: 'Les champs nom, email et message sont requis' 
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Email invalide' });
    }

    // Clé API liée au compte prospect@capisen.fr → envoi vers cette adresse
    const recipientEmail = process.env.CONTACT_EMAIL || 'prospect@capisen.fr';

    // Prepare email content with proper escaping
    const safeName = name.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeEmail = email.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeCompany = company ? company.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
    const safeMessage = message.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: 'CAPISEN Contact <onboarding@resend.dev>',
      to: [recipientEmail],
      replyTo: email,
      subject: `Nouveau message de contact - ${safeName}${safeCompany ? ` (${safeCompany})` : ''}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #000; border-bottom: 2px solid #000; padding-bottom: 10px;">
            Nouveau message de contact
          </h2>
          
          <div style="margin-top: 20px;">
            <p><strong>Nom:</strong> ${safeName}</p>
            <p><strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p>
            ${safeCompany ? `<p><strong>Entreprise:</strong> ${safeCompany}</p>` : ''}
          </div>
          
          <div style="margin-top: 30px;">
            <h3 style="color: #000; margin-bottom: 10px;">Message:</h3>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; white-space: pre-wrap;">
              ${safeMessage.replace(/\n/g, '<br>')}
            </div>
          </div>
        </div>
      `,
      text: `
Nouveau message de contact

Nom: ${name}
Email: ${email}
${company ? `Entreprise: ${company}` : ''}

Message:
${message}
      `,
    });

    if (error) {
      const message = error?.message || 'L\'envoi a échoué. Veuillez réessayer ou nous contacter par email.';
      return res.status(500).json({ 
        error: 'Erreur lors de l\'envoi de l\'email',
        details: message
      });
    }

    res.json({ 
      success: true, 
      message: 'Email envoyé avec succès',
      id: data?.id 
    });
  } catch (_error) {
    res.status(500).json({ 
      error: 'Erreur lors de l\'envoi de l\'email',
      details: 'Une erreur est survenue. Veuillez réessayer.'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    resendConfigured: !!apiKey,
    contactEmail: process.env.CONTACT_EMAIL || 'prospect@capisen.fr'
  });
});

app.listen(PORT);
