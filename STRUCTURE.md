# Structure

## React frame
- `client/src/App.tsx` — dark theme and root route.
- `client/src/components/GameCanvas.tsx` — full-screen canvas plus HUD controls; dispatches semantic custom events only.
- `client/src/index.css` — visual system: navy/teal/brass palette, glass panels, responsive controls, reduced-motion support.

## Babylon canvas
- `client/src/game/scene.ts` — plain TypeScript game module.
  - Camera and lights.
  - Procedural table, field lines, rails, goals and legs.
  - Player row factory and replaceable `classic`, `neon`, `ember` model kits.
  - Ball simulation and scoring.
  - Keyboard and semantic window event input.
  - Optional background import of the supplied glTF source mesh.

## Assets
- Large images and source geometry live in WebDev private storage, referenced through `/manus-storage/...` URLs.
- `Foosball_Table_web.gltf` is a patched copy whose image and binary buffer URIs point to the uploaded storage paths.
