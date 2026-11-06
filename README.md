# MOMENTUM.IO — Bots plus compétitifs + fluidité + contacts

Version créée à partir de l'archive fournie `MOMENTUM_IO_BOTS_NATURELS_COLLISIONS(1).zip`.

## Changements

- **IA des bots :** retour à une poursuite directe et à la recherche de cibles variées, sans séquences artificielles « poursuite → passe → fuite ». Vitesses, virages et boosts rehaussés pour rendre les adversaires plus difficiles. Ils peuvent attaquer d'autres bots et être éliminés.
- **Murs :** anticipation du bord uniquement quand un vaisseau s'en approche en allant vers l'extérieur. Pas de ralentissement massif dans une grande bande de l'arène.
- **Collisions serveur :** détection de l'intersection des coques orientées et de la pointe, par balayage de la trajectoire. Contacts latéraux amortis ; la pointe élimine sa cible ; pointe contre pointe : le plus rapide l'emporte.
- **Fluidité :** mini-carte dessinée environ 20 fois/s au lieu de chaque image, rendu adaptatif sur PC et téléphone en cas de faible FPS, résolution de dessin maximale de 1,5×, 20 mises à jour/s des positions serveur, 30 transmissions/s du joueur et synchronisation des planètes plus espacée (les planètes continuent à bouger dans le navigateur).
- **Conservés :** écrans, boutique, Google/Supabase, planètes, loot et commandes du joueur.

## Vérifications locales

- Vérification de syntaxe de `server.js` et du JavaScript du jeu.
- Simulation du serveur sur 150 secondes avec 20 bots : poursuite, boosts, impacts contre les murs et éliminations entre bots surveillés. Aucune occurrence sur le bord physique de l'arène lors de la simulation exécutée.
- Tests de collisions : pointe par l'arrière, pointe contre pointe, traversée rapide, absence de collision entre vaisseaux éloignés.
- Test de rendu Chromium à 1600×900 et DPR 2 : deux comparaisons montrent une amélioration du compteur FPS dans ce banc d'essai (ancienne version 37 à 48 FPS, version modifiée environ 60 FPS). Il ne s'agit **pas** d'un test de FPS sur ton ordinateur ni sur Render.
- Tests réalisés sans erreur JavaScript visible dans le banc d'essai. La latence réelle de Render reste à vérifier.

## Déployer

1. Décompresse le ZIP.
2. Téléverse seulement les fichiers modifiés `server.js` et `public/index.html` dans les mêmes chemins sur GitHub. `README.md` est facultatif.
3. Confirme le commit ; sur Render, vérifie que le bon commit affiche « Live ».
4. Recharge complètement le jeu (Ctrl + Maj + R) et teste les combats.

**Important :** l'archive source fournie est la version « BOTS_NATURELS_COLLISIONS ». Si ton dépôt GitHub contient des modifications créées ensuite, notamment un autre correctif de collisions, compare les fichiers avant de remplacer la version déployée. Cette archive ne récupère pas automatiquement d'éventuels changements plus récents.

**Paiements :** l'économie est encore une démo locale. N'active pas Stripe en mode réel dans cette version.
