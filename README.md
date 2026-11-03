# MOMENTUM.IO — Jouer ensemble dans Chrome, sans rien installer

## Ce qu'il faut savoir

Les JOUEURS ne doivent rien installer. Le jeu fonctionne sur Chrome, Edge ou Firefox et utilise les WebSockets pour jouer ensemble dans une même arène.

Pour que tes amis jouent depuis des maisons différentes, il faut publier le serveur sur Internet UNE FOIS. Ce ZIP contient le projet prêt à publier mais **n'est pas encore hébergé**.

## Mise en ligne : uniquement avec Chrome

1. Sur https://github.com/new , crée un dépôt GitHub (par exemple `momentum-io`). Tu peux le mettre privé si ton hébergeur a accès au dépôt.
2. Dans le dépôt, clique **Add file → Upload files**. Décompresse le ZIP sur ton PC (Windows sait le faire sans installation). Ouvre le dossier `MOMENTUM_CHROME_EN_LIGNE` et glisse-dépose son **contenu** dans la zone de dépôt GitHub : `server.js`, `package.json`, `render.yaml`, `README.md`, et le dossier `public` contenant les fichiers HTML. Valide **Commit changes**. Vérifie que `server.js` est à la racine et que `public/index.html` est bien présent.
3. Ouvre https://dashboard.render.com/ , connecte GitHub si demandé. Clique **New → Web Service**, sélectionne ton dépôt, puis règle : **Language/Runtime : Node**, **Build command : `npm install --omit=dev`**, **Start command : `npm start`**, **Instance : Free**. Clique **Create Web Service**.
4. Lorsque le déploiement indique **Live**, ouvre l'URL publique fournie par Render (du genre `https://ton-projet.onrender.com`).
5. Dans le menu, choisis un des serveurs publics, ou crée un **salon privé**. Transmets l'URL et le code de salon à tes amis. Chacun ouvre le lien dans Chrome, sans installation.

## Pourquoi ce n'est pas encore une URL jouable

Un fichier HTML ouvert localement ne peut pas héberger un multijoueur public. Le serveur Node.js et ses WebSockets doivent tourner chez un hébergeur : Render se charge de cela sans rien installer sur votre ordinateur.

## Commandes du jeu

- Souris : direction
- Espace : boost
- Collecte des orbes : énergie, XP, progression
- Le plus rapide remporte la collision
- Salons publics : Vortex / Pulse / Drift
- Salons privés : code d'invitation

## Limitations actuelles

- Jusqu'à 24 joueurs par salon, capacité théorique non garantie sous forte charge.
- Le jeu est un prototype : pas de comptes, ni de sauvegarde permanente des scores et salons.
- Le serveur gratuit Render s'endort après une période d'inactivité; sa réactivation peut prendre environ une minute. Les salons privés disparaissent quand le serveur redémarre.
- L'hébergement gratuit et ses limites peuvent changer; consulter Render avant de déployer.

## Développeur (facultatif)

`npm start` puis `http://localhost:3000`. Ceci est UNIQUEMENT un mode test local; il n'est pas nécessaire pour jouer après publication.
