# MOMENTUM.IO — Correctif bots, fluidité, loot et interface

Version bêta déployable sur le service Render existant.

## Modifications
- IA serveur : les bots privilégient désormais des adversaires bots (environ 82 % des choix quand disponibles), tout en pouvant attaquer les joueurs.
- Loot visible à chaque destruction de bot (y compris bot contre bot).
- Lissage et légère extrapolation des pilotes reçus via WebSocket, sans changer les contrôles du joueur local.
- Interface : lisibilité du profil, records, coffre, boutique et fenêtre de connexion.
- Authentification Supabase Google/courriel préservée.

## Mise en ligne
Dézipper et transférer les fichiers à la racine du dépôt Github : public/index.html, server.js, package.json, render.yaml et README.md. Confirmer le commit; Render redéploiera le service existant. Variables Render SUPABASE_URL et SUPABASE_ANON_KEY inchangées.

## Limites
Version bêta : les orbes issus des morts sont actuellement générés visuellement/localement pour chaque client et l'économie n'est pas encore entièrement validée par le serveur. Les collisions des joueurs ne sont pas encore garanties par une simulation 100 % autoritaire. Ne pas activer de paiements réels.
