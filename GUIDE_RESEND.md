# 📧 Guide complet : Configuration de l'envoi d'emails avec Resend

Ce guide vous explique **étape par étape** comment intégrer Resend pour envoyer des emails depuis votre formulaire de contact.

---

## 📋 Étape 1 : Installation des packages nécessaires

Installez tous les packages requis en une seule commande :

```bash
npm install resend express cors dotenv
npm install --save-dev @types/express @types/cors tsx concurrently
```

**Packages installés :**
- `resend` : SDK pour envoyer des emails via Resend
- `express` : Framework pour créer le serveur API
- `cors` : Permet au frontend d'appeler l'API
- `dotenv` : Gère les variables d'environnement
- `tsx` : Exécute TypeScript directement
- `concurrently` : Lance plusieurs commandes en parallèle

---

## 📁 Étape 2 : Créer le serveur API

Créez un dossier `server` à la racine du projet et un fichier `server/index.ts` :

```typescript
import express from 'express';
import cors from 'cors';
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Email endpoint
app.post('/api/contact', async (req, res) => {
  try {
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

    // Get recipient email from environment or use default
    const recipientEmail = process.env.CONTACT_EMAIL || 'contact@capisen.fr';

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: 'CAPISEN Contact <onboarding@resend.dev>', // Changez pour votre domaine vérifié
      to: [recipientEmail],
      replyTo: email,
      subject: `Nouveau message de contact - ${name}${company ? ` (${company})` : ''}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #000; border-bottom: 2px solid #000; padding-bottom: 10px;">
            Nouveau message de contact
          </h2>
          
          <div style="margin-top: 20px;">
            <p><strong>Nom:</strong> ${name}</p>
            <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
            ${company ? `<p><strong>Entreprise:</strong> ${company}</p>` : ''}
          </div>
          
          <div style="margin-top: 30px;">
            <h3 style="color: #000; margin-bottom: 10px;">Message:</h3>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; white-space: pre-wrap;">
              ${message.replace(/\n/g, '<br>')}
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
      return res.status(500).json({ 
        error: 'Erreur lors de l\'envoi de l\'email',
        details: error.message 
      });
    }

    res.json({ 
      success: true, 
      message: 'Email envoyé avec succès',
      id: data?.id 
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      error: 'Erreur serveur',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📧 Contact endpoint: http://localhost:${PORT}/api/contact`);
});
```

---

## 🔧 Étape 3 : Modifier le formulaire de contact

Dans votre composant `ContactSection.tsx`, remplacez la fonction `handleSubmit` :

**Avant :**
```typescript
setIsSubmitting(true);

// Simulate form submission
await new Promise((resolve) => setTimeout(resolve, 1500));

setIsSubmitting(false);
setIsSubmitted(true);
```

**Après :**
```typescript
setIsSubmitting(true);

try {
  // Get API URL from environment or use default
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  
  const response = await fetch(`${apiUrl}/api/contact`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(result.data),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Erreur lors de l\'envoi du message');
  }

  setIsSubmitted(true);
} catch (error) {
  console.error('Error sending message:', error);
  setErrors({
    message: error instanceof Error ? error.message : 'Erreur lors de l\'envoi du message. Veuillez réessayer.',
  });
} finally {
  setIsSubmitting(false);
}
```

---

## ⚙️ Étape 4 : Configurer les scripts npm

Ajoutez ces scripts dans votre `package.json` :

```json
{
  "scripts": {
    "dev": "vite",
    "dev:server": "tsx watch server/index.ts",
    "dev:all": "concurrently \"npm run dev\" \"npm run dev:server\"",
    "server": "tsx server/index.ts"
  }
}
```

---

## 🔐 Étape 5 : Créer le fichier .env

1. Créez un fichier `.env` à la racine du projet
2. Ajoutez ces variables :

```env
# Clé API Resend (obtenue sur https://resend.com/api-keys)
RESEND_API_KEY=re_VOTRE_CLE_API_ICI

# Email de destination pour recevoir les messages
CONTACT_EMAIL=contact@capisen.fr

# Port du serveur API (optionnel)
PORT=3001
```

3. Ajoutez `.env` dans `.gitignore` pour ne pas le commiter :

```
.env
.env.local
```

---

## 🎯 Étape 6 : Obtenir votre clé API Resend

1. Allez sur [https://resend.com](https://resend.com)
2. Créez un compte (gratuit)
3. Allez dans [API Keys](https://resend.com/api-keys)
4. Cliquez sur "Create API Key"
5. Donnez-lui un nom (ex: "CAPISEN Website")
6. Copiez la clé (elle commence par `re_`)
7. Collez-la dans votre fichier `.env` :

```env
RESEND_API_KEY=re_VOTRE_CLE_COPIEE_ICI
```

⚠️ **Important** : Ne partagez jamais votre clé API publiquement !

---

## 🚀 Étape 7 : Lancer l'application

### Option 1 : Tout lancer ensemble (recommandé)

```bash
npm run dev:all
```

Cela lance :
- Frontend Vite sur `http://localhost:8080`
- Serveur API sur `http://localhost:3001`

### Option 2 : Lancer séparément

**Terminal 1 - Frontend :**
```bash
npm run dev
```

**Terminal 2 - Backend :**
```bash
npm run dev:server
```

---

## ✅ Étape 8 : Tester

1. Ouvrez `http://localhost:8080`
2. Allez à la section "Contact"
3. Remplissez le formulaire :
   - Nom
   - Email
   - Entreprise (optionnel)
   - Message
4. Cliquez sur "Envoyer le message"
5. Vérifiez que l'email arrive à l'adresse configurée dans `CONTACT_EMAIL`

---

## 🌐 Étape 9 : Configuration pour la production

### A. Vérifier votre domaine dans Resend

1. Allez sur [Resend Domains](https://resend.com/domains)
2. Cliquez sur "Add Domain"
3. Entrez votre domaine (ex: `capisen.fr`)
4. Suivez les instructions pour vérifier votre domaine (ajout de records DNS)

### B. Modifier l'adresse d'envoi

Dans `server/index.ts`, ligne 41, changez :

```typescript
// Avant (pour les tests)
from: 'CAPISEN Contact <onboarding@resend.dev>',

// Après (pour la production)
from: 'CAPISEN Contact <contact@capisen.fr>',
```

### C. Configurer l'URL de l'API en production

Créez un fichier `.env.production` ou configurez dans votre hébergeur :

```env
VITE_API_URL=https://api.capisen.fr
RESEND_API_KEY=re_VOTRE_CLE_API
CONTACT_EMAIL=contact@capisen.fr
```

---

## 🔍 Dépannage

### Erreur : "RESEND_API_KEY is not defined"
- ✅ Vérifiez que le fichier `.env` existe à la racine
- ✅ Vérifiez que la variable est bien nommée `RESEND_API_KEY`
- ✅ Redémarrez le serveur après avoir créé/modifié `.env`

### Erreur : "Domain not verified"
- ✅ Pour les tests, utilisez `onboarding@resend.dev`
- ✅ Pour la production, vérifiez votre domaine dans Resend Dashboard

### Le formulaire ne fonctionne pas
- ✅ Vérifiez que le serveur API est lancé (`npm run dev:server`)
- ✅ Vérifiez la console du navigateur (F12) pour voir les erreurs
- ✅ Vérifiez que l'URL de l'API est correcte (par défaut `http://localhost:3001`)

### Erreur CORS
- ✅ Vérifiez que `cors()` est bien configuré dans `server/index.ts`
- ✅ Vérifiez que le serveur API est bien lancé

---

## 📝 Checklist récapitulative

- [ ] Packages installés (`resend`, `express`, `cors`, `dotenv`, `tsx`, `concurrently`)
- [ ] Serveur API créé (`server/index.ts`)
- [ ] Formulaire modifié pour appeler l'API
- [ ] Scripts npm ajoutés dans `package.json`
- [ ] Fichier `.env` créé avec la clé API Resend
- [ ] `.env` ajouté dans `.gitignore`
- [ ] Serveur API lancé et fonctionnel
- [ ] Test d'envoi d'email réussi
- [ ] Domaine vérifié dans Resend (pour la production)
- [ ] Adresse d'envoi modifiée pour la production

---

## 🎓 Résumé rapide

1. **Installer** : `npm install resend express cors dotenv`
2. **Créer** : `server/index.ts` avec l'endpoint `/api/contact`
3. **Modifier** : `ContactSection.tsx` pour appeler l'API
4. **Configurer** : `.env` avec `RESEND_API_KEY`
5. **Lancer** : `npm run dev:all`
6. **Tester** : Remplir le formulaire et vérifier l'email

---

## 📚 Ressources utiles

- [Documentation Resend](https://resend.com/docs)
- [Resend Dashboard](https://resend.com/dashboard)
- [API Keys](https://resend.com/api-keys)
- [Domains](https://resend.com/domains)

---

**C'est tout !** Vous devriez maintenant pouvoir configurer Resend vous-même. 🎉
