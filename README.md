# MOMENTUM.IO — Level-Based Trails (Full GitHub Release)

Upload all **five files** to the repository root, keeping `public/index.html` in `public/`. Render automatically deploys the new version after committing.

## Changes in this release

- The number of translucent **bubble-trail** particles now increases only when a ship reaches a visual evolution milestone: **5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, and 100**. There is no trail below level 5. Between two milestones the number stays the same, regardless of speed.
- The bubble-trail *reach* also steps up at these milestones. At higher speeds, the same fixed count of bubbles spreads out a little farther along the trail (up to 12% extra sampling span), then draws closer again when slowing down. Speed never changes the count.
- All non-default skin **glow/particle trails visibly extend about 20% beyond the level-earned bubble trail** once sufficient movement history exists. This is a cosmetic overlay and grants no gameplay advantage.
- Previous bubble sizes, colours, aura, the tighter following camera, evolution designs, physics, collision mechanics, bots, and orbs remain in place.

## Existing features retained

- 3,000 automatically replenishing orbs in the full dynamic arena, plus orbs dropped on kills.
- Multiplayer arena (20 pilots), bots, planets with gravity, skins/shop, level evolution through level 100.
- Google sign-in through Supabase. Private Escape admin tools are served only after the server verifies the authorized account. Owner actions can temporarily change active players' stats, subject to server authorization.
- Mouse controls with pointer lock (click inside the arena to capture; Escape to release).

## Verification

The JavaScript and Node syntax were checked and the server health endpoint responded correctly. The unauthenticated private admin route returned HTTP 403. Browser visual testing was blocked by the local environment's browser access restrictions; test the trail visually on the deployed version.

## Important beta limits

This remains a beta with parts of gameplay/economy handled on the client. Real payments and permanent currencies require production-grade server-side accounting and authorization. Admin stat changes affect the live match only, not the player's persistent profile.

## Corrected speed-spacing behaviour

- Levels 0–4: **zero trail bubbles**. Trail begins at level 5.
- Bubble count is determined **only** by the 13 visual-evolution milestones (5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90 and 100). At a given level, the exact count stays the same during acceleration and deceleration.
- Speed only changes **spacing**: when accelerating, the same bubbles occupy a slightly longer stretch of the trail (up to +12% sampling span in addition to their natural movement), and when slowing down the spacing contracts again.
- Skin glow trails still extend ~20% beyond the level-earned bubble trail.
- No changes to hitboxes, collision physics, camera, or private admin permissions.


## Correctif traînée / panneau admin
- Retour au premier rendu de bulles translucides (dès le niveau 5).
- Correction de l'erreur JavaScript qui interrompait l'animation avec un skin équipé et un niveau 5 ou supérieur.
- Historique visuel réinitialisé au changement de palier via le panneau admin, sans toucher aux niveaux, contrôles, collisions ou à la physique.
- Conservation de l'extension lumineuse des skins d'environ 20 %, de la caméra rapprochée et de l'optimisation des orbes.
