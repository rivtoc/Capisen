# Configuration de l'envoi d'emails avec Resend

Ce guide vous explique comment configurer l'envoi d'emails via Resend pour le formulaire de contact.

## 📋 Prérequis

1. Créer un compte sur [Resend](https://resend.com)
2. Obtenir une clé API depuis [Resend Dashboard](https://resend.com/api-keys)

## 🚀 Configuration

### 1. Créer le fichier `.env`

Copiez le fichier `env.example` et créez un fichier `.env` à la racine du projet :

```bash
cp env.example .env
```

### 2. Configurer les variables d'environnement

Ouvrez le fichier `.env` et remplissez les valeurs :

```env
# Clé API Resend (obtenue sur https://resend.com/api-keys)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx

# Email de destination pour recevoir les messages de contact
CONTACT_EMAIL=contact@capisen.fr

# Port du serveur API (optionnel, par défaut 3001)
PORT=3001
```

### 3. Configurer le domaine d'envoi dans Resend

**Important** : Par défaut, Resend utilise `onboarding@resend.dev` pour les tests. Pour la production :

1. Allez sur [Resend Domains](https://resend.com/domains)
2. Ajoutez et vérifiez votre domaine (ex: `capisen.fr`)
3. Modifiez la ligne 41 dans `server/index.ts` :
   ```typescript
   from: 'CAPISEN Contact <contact@capisen.fr>', // Utilisez votre domaine vérifié
   ```

## 🏃 Lancer l'application

### Option 1 : Lancer tout ensemble (recommandé)

```bash
npm run dev:all
```

Cela lance à la fois :
- Le serveur Vite (frontend) sur `http://localhost:8080`
- Le serveur API (backend) sur `http://localhost:3001`

### Option 2 : Lancer séparément

**Terminal 1 - Frontend :**
```bash
npm run dev
```

**Terminal 2 - Backend :**
```bash
npm run dev:server
```

## 🧪 Tester l'envoi d'emails

1. Remplissez le formulaire de contact sur le site
2. Cliquez sur "Envoyer le message"
3. Vérifiez que l'email arrive bien à l'adresse configurée dans `CONTACT_EMAIL`

## 🔍 Vérifier les logs

Le serveur API affiche les logs dans la console :
- ✅ Succès : `Email envoyé avec succès`
- ❌ Erreur : Les détails de l'erreur sont affichés

## 📧 Format de l'email reçu

L'email contiendra :
- **De** : CAPISEN Contact (via Resend)
- **À** : L'adresse configurée dans `CONTACT_EMAIL`
- **Reply-To** : L'email de la personne qui a rempli le formulaire
- **Sujet** : "Nouveau message de contact - [Nom] ([Entreprise])"
- **Contenu** : Nom, Email, Entreprise (si fournie), Message

## 🚨 Dépannage

### Erreur : "RESEND_API_KEY is not defined"
- Vérifiez que le fichier `.env` existe à la racine du projet
- Vérifiez que la variable `RESEND_API_KEY` est bien définie

### Erreur : "Domain not verified"
- Utilisez `onboarding@resend.dev` pour les tests
- Ou vérifiez votre domaine dans Resend Dashboard

### Le formulaire ne fonctionne pas
- Vérifiez que le serveur API est bien lancé (`npm run dev:server`)
- Vérifiez l'URL de l'API dans la console du navigateur (F12)
- Par défaut, l'API est sur `http://localhost:3001`

## 📝 Variables d'environnement pour la production

Pour la production, configurez :
- `VITE_API_URL` : URL de votre API en production (ex: `https://api.capisen.fr`)
- `RESEND_API_KEY` : Votre clé API Resend
- `CONTACT_EMAIL` : Email de destination
