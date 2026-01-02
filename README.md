# 🚀 Banano Toon Backend (Vercel Serverless)

**Backend GRATUIT pour Banano Toon** - Remplace Firebase Cloud Functions

## 📁 Structure

```
vercel-backend/
├── api/
│   ├── _firebase.js                    # Helper Firebase Admin
│   ├── validate-subscription.js        # Valider abonnements Google Play
│   ├── award-ad-credit.js              # Donner crédit pub regardée
│   ├── handle-play-webhook.js          # Webhook RTDN Google Play
│   ├── reset-weekly-quotas.js          # Cron: Reset quotas (lundi 00:00)
│   └── cleanup-old-transformations.js  # Cron: Nettoyage (1er du mois)
├── package.json
├── vercel.json                          # Config Vercel + Crons
└── README.md                            # Ce fichier
```

## 🚀 Déploiement

📄 **Voir le guide complet** : `../VERCEL_DEPLOYMENT_FR.md`

**Rapide** :
```bash
npm install -g vercel
vercel login
vercel
```

## 🔗 Endpoints

Une fois déployé sur `https://TON_PROJET.vercel.app` :

- `POST /api/validate-subscription` - Valider un achat
- `POST /api/award-ad-credit` - Donner 1 crédit
- `POST /api/handle-play-webhook` - Webhook Google Play
- `POST /api/reset-weekly-quotas` - Cron (auto)
- `POST /api/cleanup-old-transformations` - Cron (auto)

## 🔐 Variables d'environnement

À configurer dans Vercel Dashboard :

```
FIREBASE_PROJECT_ID=bananotoon
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@...
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
CRON_SECRET=ton_secret_aleatoire
```

## 💰 Coûts

✅ **GRATUIT** : 500,000 requêtes/mois  
✅ **Cron jobs** : Inclus gratuitement  
✅ **Pas de carte bancaire** nécessaire

## 📊 Monitoring

- Vercel Dashboard → **Logs**
- Vercel Dashboard → **Analytics**
- Vercel Dashboard → **Cron Jobs**

## 🎉 C'est tout !

Simple, gratuit, scalable ! 🚀
# bananotoon-backend
