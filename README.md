# MOMENTUM.IO — Compte obligatoire (Render + Supabase Auth)

Cette version conserve le moteur MOMENTUM.IO, les bots prudents face aux murs et les 20 places de l'arène. Elle remplace l'accès invité par une **connexion obligatoire**, avec compte courriel/mot de passe ou Google et reconnexion automatique. La déconnexion se fait depuis **Profil → Se déconnecter**.

## 1. Installer les fichiers sur GitHub

Dézippe et téléverse le **contenu** du ZIP à la racine du dépôt `momentum.io` : `server.js`, `package.json`, `render.yaml`, `README.md`, et le dossier `public/index.html`. Sur Render, conserve ton service existant : Root Directory vide, Build Command `npm install --omit=dev`, Start Command `npm start`. Les fichiers ne contiennent aucune clé secrète.

## 2. Créer Supabase (offre gratuite pour commencer)

1. Crée un projet dans https://supabase.com/dashboard et attends qu'il soit prêt.
2. Va dans **Project Settings → API Keys**. Copie le **Project URL** (`https://...supabase.co`) et la **clé publique anon/publishable**. Ne copie **jamais** la clé `service_role` / `secret` dans GitHub ni dans le navigateur.
3. Dans Render → ton service `momentum.io` → **Environment**, ajoute :
   - `SUPABASE_URL` = ton URL de projet Supabase
   - `SUPABASE_ANON_KEY` = ta clé publique anon/publishable
4. Sauvegarde. Render redéploiera ou redémarrera le service. Vérifie `/auth-config` : `enabled` doit être `true`. **Tant que ces deux variables ne sont pas présentes, le jeu refuse la connexion (comportement voulu).**

## 3. Configurer les connexions dans Supabase

Dans **Authentication → URL Configuration** :
- `Site URL` : `https://momentum-io-pu9t.onrender.com`
- Ajoute `https://momentum-io-pu9t.onrender.com/**` dans les **Redirect URLs**.

Dans **Authentication → Providers → Email**, active les connexions courriel/mot de passe et **Confirm email**. Configure un service SMTP pour une vraie exploitation : l'envoi de courriels fourni en phase de test comporte des limites et n'est pas destiné à un lancement public massif.

### Google

1. Dans Google Cloud Console, crée ou choisis un projet. Configure son **OAuth consent screen**.
2. Crée un client OAuth **Web application**.
3. Dans Supabase, **Authentication → Providers → Google**, active Google et copie l'URL de callback Supabase indiquée (`https://TONPROJET.supabase.co/auth/v1/callback`).
4. Ajoute cette **URL Supabase** aux **Authorized redirect URIs** du client OAuth Google (et non `/` sur Render).
5. Colle le **Client ID** et le **Client secret** Google dans le formulaire Google de Supabase, et enregistre. Ne mets pas le secret Google dans GitHub ou dans `index.html`.
6. Pour le retour dans le jeu, conserve les URL Render autorisées dans Supabase → URL Configuration.

## 4. Fonctionnement

- Le joueur ne peut pas jouer sans une session Supabase valide. Il peut créer un compte courriel + mot de passe, se connecter, ou utiliser Google si Google OAuth est configuré.
- Supabase gère les mots de passe (le projet MOMENTUM.IO ne les stocke **pas**). La bibliothèque Supabase JS sauvegarde et rafraîchit automatiquement la session dans le navigateur.
- Lors de l'entrée dans l'arène, le serveur Render vérifie le jeton d'accès auprès de Supabase. Il refuse les entrées sans jeton ou avec un jeton invalide. Il limite les entrées simultanées à une connexion par compte.
- Le bouton **Profil → Se déconnecter** efface la session d'authentification et ramène à l'écran de connexion.
- Chaque compte dispose d'un cache local de records, de skins et de jetons distinct sur le navigateur, indexé par son identifiant de compte. **Ce cache n'est pas encore synchronisé entre appareils et n'est pas une économie sécurisée.** Les récompenses sont toujours simulées côté navigateur.

## 5. Restrictions importantes avant commercialisation

- Les jetons, les skins et les records **ne sont pas encore enregistrés dans une base de données partagée** : seule l'identité du compte est réellement persistée chez Supabase. Ne promets pas des skins synchronisés entre appareils à ce stade.
- Le serveur ne calcule pas encore toute la physique, l'XP et les revenus de jetons : il n'est pas autoritaire pour l'économie. **Ne branche pas Stripe en mode réel**, car une version modifiée du navigateur pourrait fabriquer des jetons.
- Les sauvegardes cloud de progression, l'antitriche complet, les protections anti-abus renforcées, les limites de trafic et les tests sous charge restent à faire.
- Un hébergement gratuit Render peut se mettre en veille, occasionner un délai au premier chargement ou redémarrer.
- Supabase JS est chargé depuis un CDN; une connexion Internet est nécessaire à l'authentification.

Pour le lancement commercial, créer une table de profils sécurisée et un registre transactionnel de jetons côté serveur; effectuer l'attribution des récompenses par un moteur autoritaire et rendre tous les achats idempotents.
