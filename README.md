# MOMENTUM.IO — Trajectoires bots corrigées

Mise à jour à téléverser à la racine du dépôt GitHub `momentum.io`, puis déploiement automatique sur Render.

## Correction de l'IA
- Les bots alternent entre patrouille et interceptions de courte durée (1,5 à 3 secondes).
- Les bots ne peuvent plus poursuivre une cible indéfiniment : ils rompent leur trajectoire lorsqu'ils sont trop près, qu'ils doivent faire demi-tour ou après l'engagement.
- La visée anticipe le mouvement de l'adversaire et évite les poursuites « nez à queue » en rond.
- Les bots continuent à combattre d'autres bots et à éviter les murs.
- Aucun changement des contrôles et de la physique du joueur.

## Authentification
Conserver les variables Render `SUPABASE_URL` et `SUPABASE_ANON_KEY`; la connexion Google/courriel reste celle de la version précédente.

## Paiements
**Ne pas activer les vrais paiements Stripe sur cette bêta**. L'inventaire, les jetons et les récompenses ne sont pas encore sous contrôle serveur robuste et persistant. Avant toute vente : inventaire stocké côté serveur lié à l'identité Supabase, transaction Stripe signée et idempotente, achats/loot autorisés côté serveur, tests de fraude et sauvegardes.
