# MOMENTUM.IO — POWER SIGNATURE (full GitHub release)

**Complete update based on the most recent English release with 3,000 orbs.** Upload the five files to GitHub, preserving `public/index.html`.

## New: opponents look as powerful as they really are

- **Evolving neon trails** grow brighter and wider with both player level and actual speed.
- **Up to three moving energy rings** and a pulsing, spiky **aura** distinguish strong pilots even when not boosting.
- **Decorative winglets** make high-level ships appear more imposing without changing the four-point collision shape or hitbox.
- **Occasional lightning** near the most advanced ships, plus **transparent ghost silhouettes** behind very fast pilots.
- **Mach-cone / sonic-barrier effect** on high-speed boosted ships, with a brief shock ring when the threshold is crossed. Thresholds scale with actual maximum speed.
- **Bigger, speed-sensitive shockwaves at confirmed collisions**. The server sends a visual-only `impact` event; its combat/collision decisions are unchanged.
- **Visual power now applies to all remote players and bots**, not just your own ship. Level markers and `FAST` labels complement the graphical cues.
- **FPS-aware detail:** expensive ghost/lightning/ring animations are reserved for nearby ships; distant pilots retain a lower-cost power outline. Low-FPS mode further reduces nonessential effects.

## Previous features retained

- Full English UI, **MOMENTUM.IO** home title, 3,000 evenly distributed orbs in the dynamic arena, orb–planet exclusion, scattered loot.
- Multiplayer 20-pilot arena, Google/Supabase login and account gate, server-side bot navigation, movement and wall avoidance.
- Existing hitbox, swept collision logic, network contact reconciliation, player flight physics, inertia after boost, planet gravity.
- Daily chest, ranking banner, skins/shop/profile, local tokens, improved shop readability.
- Mouse pointer lock (click arena; Escape to release), mobile touch controls.
- Compact centered Game Over modal and integrated site errors.

## Deploy to GitHub/Render

1. Extract this ZIP.
2. In the `oliviermax275-design/momentum.io` GitHub repository, upload the five files **with the `public/` folder preserved** and commit changes to `main`.
3. Wait for the Render deploy to show `Live`. Reload the game with `Ctrl+Shift+R`.
4. Test with a level 10–35 opponent or several fast bots. If you see frame drops, compare FPS with the ORIGIN skin and premium skins.

## Testing and limitations

- Node syntax check, client JS syntax check, and browser smoke tests passed. Full 3,000-orb game loaded with no JS errors.
- A synthetic headless Chromium stress test with 19 nearby high-power opponents ranged roughly 50–60 FPS across repeated runs, depending on test conditions. **Real Render latency, live multiplayer effects, mobile devices and 60 FPS on your own computer are not guaranteed by these tests.**
- **Token balances, ranking rewards, skins and purchases still use local prototype storage. Real-money payment must remain disabled** until a secure, server-authoritative economy is implemented and verified.
