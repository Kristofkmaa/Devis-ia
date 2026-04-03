# DevisIA — Guide de déploiement

## Étape 1 — Créer les comptes (gratuit)

1. **GitHub** → https://github.com/signup
2. **Supabase** → https://supabase.com (Se connecter avec GitHub)
3. **Vercel** → https://vercel.com (Se connecter avec GitHub)

---

## Étape 2 — Configurer Supabase

1. Dans Supabase, clique **"New Project"**
   - Nom : `devis-ia`
   - Mot de passe base de données : notez-le
   - Région : `West EU (Ireland)`

2. Une fois créé, va dans **SQL Editor > New Query**
   - Copie-colle tout le contenu du fichier `supabase-setup.sql`
   - Clique **Run**

3. Va dans **Settings > API**
   - Note le `Project URL` (ex: https://xxx.supabase.co)
   - Note le `anon public` key

---

## Étape 3 — Déployer sur Vercel

1. Crée un nouveau repo sur GitHub :
   - https://github.com/new
   - Nom : `devis-ia`
   - Privé ou public, au choix

2. Upload tous les fichiers de ce dossier sur GitHub

3. Sur Vercel :
   - Clique **"New Project"**
   - Importe ton repo GitHub `devis-ia`
   - Dans **Environment Variables**, ajoute :
     ```
     NEXT_PUBLIC_SUPABASE_URL = [ton URL Supabase]
     NEXT_PUBLIC_SUPABASE_ANON_KEY = [ta clé anon Supabase]
     ANTHROPIC_API_KEY = [ta clé Anthropic depuis console.anthropic.com]
     ```
   - Clique **Deploy**

---

## Étape 4 — Ton URL est prête !

Vercel te donne une URL du type : `https://devis-ia-xxx.vercel.app`

Tu peux la partager à tes clients. Chacun crée son compte et a son propre espace.

---

## Étape 5 — Nom de domaine (optionnel, ~10€/an)

Sur Vercel > Settings > Domains, tu peux connecter un domaine comme `devia.fr`.

---

## Structure du projet

```
devis-ia/
├── app/
│   ├── api/generate/route.js   ← Appel Anthropic (côté serveur, sécurisé)
│   ├── login/page.jsx           ← Page de connexion
│   ├── signup/page.jsx          ← Page d'inscription
│   ├── dashboard/page.jsx       ← App principale (protégée)
│   ├── layout.jsx
│   ├── page.jsx                 ← Redirection auto
│   └── globals.css
├── components/
│   └── DevisApp.jsx             ← Toute l'application
├── lib/
│   └── supabase.js              ← Client Supabase
├── supabase-setup.sql           ← Script à exécuter dans Supabase
└── .env.local.example           ← Template des variables d'environnement
```
