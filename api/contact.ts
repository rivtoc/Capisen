import { Resend } from 'resend';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const resend = new Resend(process.env.RESEND_API_KEY);

interface ContactFormData {
  name: string;
  email: string;
  company?: string;
  message: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    
    if (!apiKey) {
      return res.status(500).json({ 
        error: 'Erreur lors de l\'envoi de l\'email',
        details: 'Service temporairement indisponible.'
      });
    }

    const { name, email, company, message } = req.body as ContactFormData;

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
      console.error('Resend error:', error);
      const message = error?.message || 'L\'envoi a échoué. Veuillez réessayer ou nous contacter par email.';
      return res.status(500).json({ 
        error: 'Erreur lors de l\'envoi de l\'email',
        details: message
      });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Email envoyé avec succès',
      id: data?.id 
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      error: 'Erreur lors de l\'envoi de l\'email',
      details: 'Une erreur est survenue. Veuillez réessayer.'
    });
  }
}