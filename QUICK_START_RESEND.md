# ⚡ Quick Start : Resend en 5 minutes

## 1️⃣ Installation
```bash
npm install resend express cors dotenv
npm install --save-dev @types/express @types/cors tsx concurrently
```

## 2️⃣ Créer `server/index.ts`
Copiez le code du serveur API (voir `GUIDE_RESEND.md`)

## 3️⃣ Modifier `ContactSection.tsx`
Remplacez `handleSubmit` pour appeler l'API au lieu de simuler

## 4️⃣ Créer `.env`
```env
RESEND_API_KEY=re_VOTRE_CLE
CONTACT_EMAIL=contact@capisen.fr
PORT=3001
```

## 5️⃣ Ajouter scripts dans `package.json`
```json
"dev:server": "tsx watch server/index.ts",
"dev:all": "concurrently \"npm run dev\" \"npm run dev:server\""
```

## 6️⃣ Lancer
```bash
npm run dev:all
```

## 7️⃣ Obtenir la clé API
1. https://resend.com → Créer compte
2. API Keys → Create API Key
3. Copier la clé (commence par `re_`)
4. Coller dans `.env`

## 8️⃣ Tester
Remplir le formulaire → Vérifier l'email reçu ✅

---

📖 **Guide détaillé** : Voir `GUIDE_RESEND.md`
