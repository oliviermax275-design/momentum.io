# MOMENTUM.IO — Arène partagée (bêta)

Jeu **unique** sur `/` avec le moteur visuel et le pilotage de la dernière version solo.

- Une arène, maximum 20 vrais joueurs.
- Complète jusqu'à 20 pilotes avec des bots synchronisés. Un bot est retiré à chaque arrivée, réapparait lorsqu'un joueur quitte.
- Déplacements de joueurs et bots sur le même écran. Combat de pointe évalué côté serveur à partir des positions reçues.
- Gravité et planètes partagées entre joueurs.
- Réanimation : le bouton contient le prix directement.

## Installer sur Render

Remplacer le contenu du dépôt GitHub par ces fichiers, dossier `public` inclus.
Root Directory vide, Build Command `npm install --omit=dev`, Start Command `npm start`.
Voir `/healthz` pour le statut du serveur.

## Restrictions sérieuses de cette bêta

La physique de chaque pilote, la collecte d'orbes, les niveaux et la progression des jetons sont encore calculés dans le navigateur. Le serveur synchronise les positions, les bots, les planètes et décide les combats à partir des positions reçues, mais **il n'est pas encore autoritaire pour toutes les mécaniques**. Les triches et désynchronisations sont donc possibles. Le jeu n'est pas adapté aux classements compétitifs officiels ni aux paiements réels. Ne connectez pas Stripe en production à cette bêta.

Le serveur Render gratuit peut se mettre en veille; sessions et bots sont en mémoire et sont remis à zéro au redémarrage.

Pour une sortie publique commerciale, migrer toute la simulation et les inventaires vers un backend autoritaire avec stockage durable.

## Récompenses de classement de cette version

Le top 1 gagne **3 jetons/minute**, le top 2 **2 jetons/minute**, le top 3 **1 jeton/minute**. Aucun compteur de 12 points ni coffre supplémentaire lié au classement. Le coffre quotidien est indépendant.

En bêta, ces jetons sont calculés et sauvegardés localement dans le navigateur (ils ne sont **pas** des jetons sécurisés de compte serveur). Pour la version commerciale, les jetons de classement doivent être accordés par un serveur autoritaire et conservés dans la base sécurisée du joueur.
