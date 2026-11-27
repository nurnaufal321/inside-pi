# Iso kit reference

Every lesson scene and Try-it simulation is drawn with the primitives in `module-3-4-exception-compression/src/components/iso/`. This page lists what exists, so new lessons reuse the kit instead of drawing raw SVG.

## Coordinates
- Grid units are projected by `iso(x, y, z)` in `iso.ts` (`U = 14` px per unit). `z` is the height in screen pixels.
- `GridPt` is `[x, y]` or `[x, y, z]`. Paths are arrays of `GridPt`.
- **+x** runs to the lower right, **+y** to the lower left, and **−x/−y** go up and away from the viewer.

## Layout rules
- Space nodes about **7.5 grid units** apart (`[0, 7.5]`, `[0, 0]`, `[0, -7.5]`…).
- The **last leg of an arrow should travel in −x or −y**, so the arrowhead lands on a block's visible front face.
- Pad paths about **2.4 units** off a `Block` (size 2) centre; `routes.ts` helpers do this for you.
- Point the camera **40–50 px above** the node in focus, because the metric chips cover the top of the stage.
- Standard pill offsets relative to an `Ent`: `TOP = { x: -46, y: -100 }` (state or annotation) and `BOTTOM = { x: 14, y: 50 }` (process name, `mono`).
- Raised tiers: put a `Slab` under a group and set `z` (for example `Z = 10`) on the `Ent`s and path points on it.
- `viewBox` is normally `'-420 -250 840 500'`. `camera(step)` returns `[x, y, zoom]` in viewBox pixels, with zoom from about 0.9 (overview) to 1.4 (close-up).

## Primitives (`primitives.tsx`)
| Component | Use for | Key props |
|---|---|---|
| `Ent` | Positions children at a grid point | `x y z`, `show` (fades in/out) |
| `Block` | A service, subsystem or machine | `label` (string or 2 lines), `icon` (Lucide), `tint`, `size` (2), `h` (46), `glow` (css colour), `dim` |
| `IsoBox` | A raw rounded box | `ax ay h tint r shadow glow` |
| `Slab` | A floor or tier under a group | `ax ay h tint r` |
| `Cylinder` | Storage, queues, files | `rx h tint`, `level` 0–1 + `levelTint` (fill gauge), `label`, `icon`, `glow`, `dim` |
| `Crowd` / `Person` | Users or clients | `cols rows gap z count` |
| `Pill` | Labels and state chips | `text icon tone x y fs mono` |
| `Caption` | Plain text | `text x y anchor muted fs` |
| `Gauge` | A small dial | `value x y icon unit` |
| `Link` | A static arrow along a path | `pts`, `kind` (`solid`, `muted`, `bad`), `arrow`, `both`, `show` |
| `Flow` | Animated packets along a path (walkthroughs) | `pts n dur kind kinds fade delay show` |
| `Token` | One packet at a screen point (Try-it sims) | `x y kind opacity` |
| `Packet` | One packet at a grid point | `x y z kind` |

**Tints** (`Defs.tsx`): `blue orange green yellow purple rose slab grey`. Use the matching `var(--<tint>-side-b)` as a `glow` colour, or `var(--red)` for an error.

**Pill tones**: `default bad good warn violet dark`.

**Packet kinds** and their colours: `raw` (grey), `blue` (reported), `ok` (stored/success), `bad` (dropped), `req` (request), `heavy`, `violet` (special path), `warn` (yellow), `ring` (outline). Each lesson's `legend` should name the kinds it uses.

## Route helpers (`routes.ts`)
- `straight(a, b, z?, padA?, padB?)`: a straight run between two nodes that share x or y.
- `viaX(a, b, …)`: leave `a` along x, turn once, arrive at `b` along y.
- `viaY(a, b, …)`: leave `a` along y, turn once, arrive at `b` along x.

For anything more complex, write the `GridPt[]` by hand (see `lessons/data-pipeline.tsx`).

## Try-it kit (`components/tryit/kit.tsx`)
- `TryFrame`: the live stage plus the event-log card. Props: `viewBox camera metrics legend paused onTogglePause onReset resetKey log`.
- `RailPortal`: renders controls into the right rail.
- `useLoop(running, dt => …)`: a requestAnimationFrame loop (`dt` is in seconds, capped at 0.05).
- Controls: `Scenarios` (preset picker), `Section`, `Slider`, `Toggle` (`tone="bad"` for failure switches), `Choice`, `Action` (a button).
- Pattern: keep sim state in a `useRef`, mutate it in `step(sim, cfg, dt)`, force a re-render each frame, and move tokens with `pointAt(screenPath(path), t)`. Export the scene's layout from the lesson file (`export const LAYOUT = …`), so the walkthrough and the sim share coordinates.

## Step content (`lessons/types.ts`)
- `tag`: `problem`, `concept`, `mechanism`, `gotcha`, `fix` or `recap`. The last step is always `recap`.
- `body`: 1–3 short paragraphs. Use `` `code` `` for PI attribute and process names, and `*emphasis*` for terms being defined.
- `callout`: `idea` (the takeaway), `warn` (a gotcha) or `tip` (a practical setting).
- `changed`: what this step added (`add`), modified (`mod`) or removed (`del`) in the scene.
- `metrics`: 2–4 chips with `tone` `good`/`warn`/`bad`.
