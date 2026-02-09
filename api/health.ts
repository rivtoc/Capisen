import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ 
    status: 'ok',
    resendConfigured: !!process.env.RESEND_API_KEY,
    contactEmail: process.env.CONTACT_EMAIL || 'prospect@capisen.fr'
  });
}