# MOMENTUM.IO — Bubble Trails + Ship Evolution + Private Owner Tools

Complete GitHub/Render release. Upload the **five project files** to the repository root, keeping `public/index.html` inside the `public` folder.

## What's new

- Original translucent **bubble trail** restored. No trail below level 5; it starts short at level 5 and progressively grows with level. Higher levels add subtle shine, reflective highlights, and twinkles; distant ships use a cheaper trail effect.
- Thirteen visual ship evolution thresholds: **5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100**. Decorative wings, tips and details become more elaborate. The original hitboxes and combat rules are unchanged.
- Impact shockwaves and debris scale more strongly with relative impact speed: softer for low-speed contact; large shockwave retained for fast combat.
- Mouse: pointer capture no longer resets aim to a fixed location at the right. Capture is initiated by clicking in the arena, and Escape releases it. Browser pointer-lock security still applies. Touch controls remain unchanged.
- Owner-only ESC panel: server-protected selection of other active pilots (humans and bots) with level, speed multiplier, shield and reset test controls. Authorization is checked on every admin command. HTML for private tools is available only to the Supabase-authenticated approved Google owner, via `GET /owner-tools`.
- Everything from the previous full release remains, including 3000 orbs, planetary gravity, online accounts, skins/shop, and game physics.

## Important limits

The multiplayer simulation is a beta and relies in part on clients for movement, progression and economy. Admin controls are test tools, not production moderation/account management. Production-grade transactions need server-authoritative currencies, audit logs, persistent state and verified payments. Changing another player's stats affects the current live match, not their permanent account profile. These changes require the other client to be connected and receive the server command; they are not stored permanently.

Tested with Node syntax checks, an HTTP health check, an unauthorized `/owner-tools` request (403), and a mock-authenticated two-player WebSocket session showing an unauthorized admin request denied and authorized owner level/speed updates delivered. Browser automation was blocked by the execution environment, so visual/performance checks should be completed after deploying to Render.
