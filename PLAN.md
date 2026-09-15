# Foosball Arena — build plan

## Intent
Convert the supplied Drive bundle from a raw glTF/STL asset drop into a playable, polished browser-based 3D foosball training arena.

## Risk slices
1. Babylon.js lifecycle inside React 19 StrictMode: one engine per canvas, resize handling, disposal.
2. Supplied glTF loading: patch relative texture/bin URIs to WebDev storage; keep a procedural fallback so gameplay is not blocked by asset latency.
3. Model replacement: replace the original figure presentation with three deterministic procedural kits (Classic, Neon Circuit, Ember Core).
4. Gameplay loop: deterministic ball motion, wall bounce, goal scoring, reset, kick, rod shift and demo mode.
5. Visual QA: responsive HUD, controls visible over the 3D scene, screenshot on the WebDev preview.

## Verification criteria
- `pnpm check` completes with no TypeScript errors.
- `pnpm build` completes successfully.
- `/` renders a full-screen Babylon canvas with no console-breaking errors.
- `?demo` produces visible ball motion and a populated arena without input.
- Model Lab buttons update the player rows without a page reload.
- Reset and Kick update gameplay state.
- Mobile-width viewport retains usable controls and readable HUD.
