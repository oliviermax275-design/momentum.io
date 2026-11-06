# MOMENTUM.IO — Version complète, correction des orbes

Projet complet pour le dépôt GitHub `momentum.io` et le service Render existant.

## Contenu

- `public/index.html` : jeu multijoueur avec connexion Supabase/Google, boutique et correction de la génération des orbes.
- `server.js` : serveur Node.js et arène multijoueur (repris de la version Bots + Fluidité V2, inchangé).
- `package.json` : commande de lancement Node.js.
- `render.yaml` : paramètres Render.

## Correction des orbes

- Aucun orbe généré dans la surface d'une planète, y compris en cas de dernier tirage ou au lancement avant réception des positions réseau.
- Les orbes obtenus après une élimination (locale ou réseau) sont placés dans une zone libre de planètes.
- Les orbes déjà présents sont déplacés si une planète dérivante les recouvre ou si les positions officielles arrivent du serveur.
- Les orbes du décor du lobby obéissent également à cette règle.
- Marge de sécurité de 24 unités, en plus du rayon visible de l'orbe.

## Déploiement

1. Décompresse ce ZIP.
2. Sur GitHub, dépôt `momentum.io`, téléverse **les fichiers décompressés** dans les mêmes chemins. Le dossier `public` doit contenir `index.html`.
3. Valide le commit sur `main`. Render redéploiera automatiquement.
4. Vérifie le statut **Live**, puis recharge le jeu avec **Ctrl + Maj + R** pour éviter le cache.

Les variables Render `SUPABASE_URL` et `SUPABASE_ANON_KEY` restent nécessaires; **ne copie jamais de clé privée dans GitHub**. La connexion Google/Supabase reste configurée comme auparavant.

**Source de ce paquet** : MOMENTUM_IO_BOTS_FLUIDITE_V2.zip (la dernière version fournie dans la conversation). Il ne récupère pas automatiquement d'éventuels fichiers modifiés ensuite dans ton dépôt GitHub. Comparer si tu y as poussé d'autres changements depuis.

**Paiements** : n'active pas les paiements réels sans valider l'économie et le stockage serveur.

## Tests locaux réalisés

- Vérification syntaxique Node.js (`server.js` et deux scripts intégrés à `index.html`).
- 6 000 orbes normaux, 4 000 orbes de récompense, puis 25 déplacements de planètes : aucun orbe superposé à une planète, avec une marge d'au moins 24 unités.
- Test de démarrage HTTP `GET /healthz` sur le serveur local.

Ces tests ne garantissent pas la fluidité ni l'absence de bugs après déploiement sur Render.
