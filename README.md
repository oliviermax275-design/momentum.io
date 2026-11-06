# MOMENTUM.IO — IA variée et collisions corrigées (bêta)

Cette archive contient **le jeu entier**, `public/index.html`, et le serveur `server.js` adapté à Render.

## Corrections
- Bots avec profils de jeu stables (chasseur, équilibré, opportuniste, prudent), alternant attaque, interception, exploration et brève esquive.
- Poursuites temporisées, choix de cibles moins répétitif, possibilité d'attaquer d'autres bots, passage d'attaque court avant de réévaluer.
- Détection de contact pointe/vaisseau sur la **trajectoire entre deux ticks** du serveur, pour réduire les impacts manqués à haute vitesse.
- Évitement de murs, planètes, affichage lissé et loot des bots conservés.
- Connexion Supabase/Google et menus conservés, sans changer la physique du vaisseau du joueur.

## Installer sur ton Render existant
1. Conserve ton dépôt GitHub et ton service Render.
2. Décompresse le ZIP. Téléverse son contenu à la racine du dépôt GitHub, en conservant le répertoire `public/`.
3. Commit sur `main`, puis attends `Live` sur Render.
4. Garde les variables `SUPABASE_URL` et `SUPABASE_ANON_KEY` déjà configurées.
5. Ouvre le jeu sur l'URL Render existante et teste plusieurs combats à grande vitesse, idéalement avec deux vrais navigateurs.

## Limites à connaître
Il s'agit toujours d'une **bêta multijoueur**. Les mouvements des vrais joueurs viennent du client, et le serveur n'est pas entièrement autoritaire. La correction des contacts réduit les impacts traversants, mais la latence réseau et les corrections visuelles peuvent en laisser apparaître. Les soldes de jetons / récompenses ne sont pas assez sécurisés pour activer les paiements réels. Ne branche pas Stripe en production à cette version.

## Correctif de collisions (pointe, arrière et traversées)

- Le serveur détecte les contacts selon les **polygones réels** des vaisseaux, et non leur centre seulement.
- Les mouvements entre deux mises à jour sont échantillonnés de façon adaptative (y compris le point de rapprochement maximal) pour limiter les traversées.
- Pointe contre arrière/flanc : l'attaquant élimine la cible; pointe contre pointe : avantage à la vitesse; flanc contre flanc : contact et rebond.
- Le rendu des vaisseaux distants rattrape plus rapidement leurs positions réseau. Il peut rester des écarts visibles en cas de forte latence, et la simulation de la physique des joueurs demeure partiellement locale dans cette bêta.
- Tests de régression fournis dans `tests/collisions.test.js` (Node.js). Pour les lancer : `npm test`.

Le correctif conserve les contrôles, les planètes, les comptes Supabase et l'économie de la version fournie. N'activez pas de paiements réels dans cette bêta.
