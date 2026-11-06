# MOMENTUM.IO — correctif complet : synchronisation, bots, orbes, boost

Version complète à téléverser sur le dépôt GitHub `oliviermax275-design/momentum.io`.

## Fichiers

- `server.js` : serveur multijoueur, bots, collisions, compensation du délai réseau.
- `public/index.html` : jeu complet, interface, connexion Google/Supabase, physique du joueur, orbes, rendu des collisions.
- `package.json` : lancement du serveur Node.js sur Render.
- `render.yaml` : configuration du service Render.
- `README.md` : ce document.

## Correctifs

1. **Synchronisation des collisions** : le navigateur teste les contours réellement visibles des vaisseaux dès le contact et signale l'impact au serveur, qui le vérifie en consultant les positions récentes de l'adversaire et la position affichée, avec bornes anti-faux contacts. Un éclair d'impact local peut précéder l'élimination confirmée par le serveur. Les vaisseaux en période de protection ne sont plus simplement traversés : le contact provoque un rebond.
2. **Bots moins regroupés** : chacun choisit ses cibles en pénalisant celles déjà poursuivies, évite les foules proches, peut explorer la carte et anticipe les planètes et les murs. Leur poursuite reste active, avec des niveaux d'agressivité variés.
3. **Orbes mieux répartis** : **2 500 orbes** sur la grande carte (au lieu de 1 500), apparition équilibrée dans des secteurs de toute l'arène, sans anneau artificiel centré sur le joueur. Les positions évitent toujours les planètes.
4. **Loot après élimination** : les 12 orbes se répartissent à des positions distinctes autour du point de destruction, avec une courte animation de dispersion, au lieu de former un seul point superposé.
5. **Inertie du boost** : relâcher Espace ne rabat plus immédiatement la vitesse à la limite sans boost. La vitesse excédentaire diminue progressivement sous l'effet du frottement et des virages.

## Installation

1. Décompresse le ZIP.
2. Dans ton dépôt GitHub, remplace les fichiers existants avec les mêmes chemins. `index.html` reste à l'intérieur du dossier `public`.
3. Clique sur **Commit changes** et attends le statut **Live** dans Render.
4. Actualise le site avec **Ctrl + Maj + R**.

Les variables `SUPABASE_URL` et `SUPABASE_ANON_KEY` sur Render ne changent pas ; **ne publie pas de clé privée** dans GitHub.

## Tests locaux (pas de garantie de latence réelle sur Render)

- Syntaxe de `server.js` et des scripts HTML vérifiée.
- Simulation de **180 secondes / 20 bots** : bots qui combattent, pas de sortie des murs, contrôle du regroupement.
- Collisions vérifiées en test unitaire : pointe-arrière, pointe-côté, pointe-pointe, validation d'un contact réseau ancien et rejet d'un contact éloigné.
- **Cinq essais WebSocket** en conditions de test avec authentification simulée : attaques arrière confirmées par le serveur et diffusion de l'événement d'élimination.
- Navigateur Chromium en mode test local : environ **60 FPS** au bout de 3 secondes, **2 500 orbes**, aucun orbe dans une planète, aucun problème JavaScript signalé.
- Loot testé : 12 positions distinctes, aucune au contact d'une planète. Inertie testée sur un vaisseau à 530 unités de vitesse.

### Limites importantes

Cette version est toujours une **bêta multijoueur** et peut comporter des anomalies sous fortes latences, après une reconnexion ou avec des personnes réelles. Les impacts sont validés côté serveur, mais les mouvements des joueurs humains restent partiellement déclarés par leur navigateur (physique non totalement autoritaire). Ne pas activer des paiements réels ni des compétitions avec récompenses payantes avant une validation de sécurité, une base de données serveur et un stress-test multi-appareils.

Base du travail : `MOMENTUM_IO_ORBES_CORRIGES_COMPLET.zip`, elle-même issue de `MOMENTUM_IO_BOTS_FLUIDITE_V2.zip`. Si d'autres fichiers ont été modifiés directement sur GitHub depuis, les changements n'y sont pas automatiquement inclus.
