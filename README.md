# MOMENTUM.IO — SHIP EVOLUTION + PRIVATE OWNER PANEL

Complete GitHub/Render release built on the previous **Power Signature + private admin** edition. This archive contains the normal five deployment files. The game interface remains in English.

## Ship evolution (Diep.io-style progression)

The game returns to the three strongest visual indicators of power: **long, thick neon trails**, a **bright glow/aura**, and a clear ship silhouette. Instead of relying on excessive bolts, ghost copies and sonic-cone effects, the ship's geometry evolves visually at fixed levels:

| Level | Visual form |
| --- | --- |
| 1–4 | Original dart-shaped ship |
| 5–9 | Split rear wings |
| 10–19 | Double rear fins |
| 20–34 | Interceptor with pronounced points |
| 35–49 | Wider dreadnought wings and side spines |
| 50+ | Apex: additional pointed blades and luminous details |

These upgrades apply to **all visible players and bots**, not only the owner. Visual evolution is driven by level; trail brightness also responds to actual speed. All wings and points are **cosmetic only**: they do not change a ship's hitbox, physics, turn speed, speed cap or collision winner.

The collision-impact shockwave remains from the previous version. The old sound-barrier visual, afterimages and electric lightning are removed from the persistent ship render to keep the scene readable and reduce effect cost. Paid skins retain their chosen colours and effects.

## Owner-only panel (Escape)

The owner panel is now **served only after a real account authorization**, not included in the public `index.html` page. Other players get only **Continue / Leave Match** when pressing Escape. The server verifies the Google-linked owner account with Supabase and rejects requests to `/owner-tools` and admin WebSocket commands from all other accounts. A disconnected or revoked admin client loses the panel entirely.

Owner test controls: level 20 / 50 / 100 or custom 1–500, +1 level, speed ×1 / ×3 / ×10, combo ×2 / ×5 / ×10, 60-second shield, local test chest, Top 1 reward preview, reset. These are for testing, not secure permanent progression or paid rewards.

## Preserved from previous versions

- English homepage and UI, **3,000 orbs** in the dynamic arena, planet exclusion, scattered loot.
- Multiplayer 20-pilot server, bot AI and planet gravity.
- Current server/client collision and hitbox system, handling side/rear/fast contacts.
- Mouse steering/pointer lock, keyboard boost, mobile touch controls, boost inertia.
- Google/Supabase sign-in, profile, skins, shop, chests, leaderboard rewards banner, centered Game Over window.
- Supabase configuration via existing Render environment variables.

## Deployment

1. Unzip and upload **all five files** to your GitHub `momentum.io` repository, preserving `public/index.html`.
2. Commit the changes on the `main` branch.
3. Wait for Render to deploy and show **Live**.
4. Refresh the site with **Ctrl + Shift + R**.
5. Test the ship at levels 1, 5, 10, 20, 35 and 50 using the authorized Escape panel. Also check that a regular account sees no admin controls.

No additional Supabase, Google Cloud or Render credentials are required.

## Verification / limitations

- JavaScript syntax checks passed for the Node server and browser scripts.
- Server boot and `/healthz` succeeded; unauthenticated `/owner-tools` returned HTTP **403**.
- Permission tests passed: approved Google account accepted, other addresses / non-Google provider refused, unauthorized WebSocket admin command refused.
- In Chromium with a **simulated** WebSocket, a normal player had no admin DOM; owner authorization fetched the private panel; setting level 50 worked; revoking access removed the panel. Browser test captured the level-50 evolving ship and found no JavaScript errors.
- A comprehensive high-load FPS test with 19 evolved ships did not complete reliably. **60 FPS in all real player and Render conditions is not guaranteed**. Test in the actual browser and report any performance issues.

**Security note:** while the owner admin commands are protected, the rest of the beta progression, token wallet and shop still rely partly on client-side state. Do not activate real payments until the economy is stored and validated server-side.
