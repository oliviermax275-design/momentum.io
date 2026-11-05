# MOMENTUM.IO — Déploiement Render (ensemble prêt à téléverser)

**À lire :** cette archive met en ligne le jeu solo actuel **et** un ancien prototype multijoueur distinct, sans fusion de leurs mécaniques. C’est une configuration de test, **pas un jeu commercial prêt à recevoir des paiements**.

## Contenu
- `public/index.html` : jeu solo récent, coffre corrigé, interface, skins, statistiques locales.
- `public/multijoueur.html` : prototype multijoueur de l'ancienne génération, pour tester plusieurs navigateurs via WebSocket. Ce prototype n'inclut pas les planètes, la boutique, les coffres ni les mêmes contrôles que le jeu récent.
- `server.js` : serveur Node.js HTTP + WebSocket, 20 **vrais clients maximum par salon**.
- `package.json` : commande de lancement `npm start`.
- `render.yaml` : configuration optionnelle pour un nouveau service Render. Le service EXISTANT peut être gardé.

## Mettre à jour ton dépôt GitHub EXISTANT
1. Télécharge le ZIP et décompresse-le sur ton ordinateur.
2. Ouvre `oliviermax275-design/momentum.io` sur GitHub et connecte-toi.
3. Clique sur **Add file > Upload files**, puis **glisse le CONTENU décompressé**, en conservant les sous-dossiers (`public/`). Le dépôt devrait contenir `server.js`, `package.json`, `render.yaml`, `README.md`, `public/index.html` et `public/multijoueur.html`.
4. **Attention** : GitHub n'accepte pas toujours les dossiers complets en glisser-déposer selon le navigateur. Si les chemins ne sont pas conservés, ajoute d'abord les fichiers de la racine, puis dépose les deux fichiers HTML dans le dossier `public`.
5. Valide **Commit changes** sur la branche `main`. Render redéploiera automatiquement si Auto-Deploy est activé.
6. Dans Render > ton Web Service > Settings, vérifie :
   - Root Directory : **vide**
   - Build Command : `npm install --omit=dev` (l'ancien `yarn` pourrait aussi marcher avec le nouveau `package.json`, mais on recommande `npm install --omit=dev`)
   - Start Command : `npm start`
   - Plan : Free (tests seulement)
7. Attends **Live** dans Render > Deploys. Ouvre `/healthz` : `status` doit être `ok`.

## URLs
- `/` : jeu solo récent
- `/multijoueur.html` ou `/multi` : prototype multijoueur WebSocket
- `/healthz` : état serveur

## Limitations importantes
- Le multijoueur est un **prototype indépendant**, et ne comporte pas encore les bots dynamiques complétant les salons à 20 pilotes. Il gère un maximum de 20 humains par salon.
- **Pas de comptes partagés entre appareils** et **aucune base de données durable** dans ce ZIP. Les achats réels Stripe sont **désactivés** ; n'ajoute aucune clé secrète Stripe dans GitHub.
- Les données du solo sont dans le navigateur, et peuvent être perdues si le stockage local est effacé.
- Le service Render Free peut se mettre en veille, redémarrer et perdre ses états en mémoire. Les salles multijoueur se réinitialisent alors.
- Avant toute publication commerciale : fusionner la simulation solo et serveur, bots, sécurité/anti-triche, base durable, authentification, paiements vérifiés serveur, modération et tests de charge.

## Test local
`node server.js` puis `http://localhost:3000` ; `http://localhost:3000/multi` pour la démo multijoueur. Aucun `npm install` nécessaire au fonctionnement (zéro dépendance externe).
