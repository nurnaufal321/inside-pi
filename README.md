# Inside PI

An interactive, isometric course on **AVEVA PI Data Archive**. Each idea is an animated diagram you step through, from what a PI point is to how a value travels from a sensor into an archive file.

**Live site:** https://nurnaufal321.github.io/inside-pi/

![How a Value Travels, step 3: the buffer between the interface and the server](docs/screenshot.png)

## The course

Seven lessons in four chapters:

| Chapter | Lesson | Steps |
|---|---|---|
| 01. Foundations | Anatomy of a PI Point | 9 |
| | How a Value Travels | 9 |
| 02. Data Flow | Exception & Compression | 10 |
| | Snapshot & Event Queue | 9 |
| 03. Reliability | Buffering | 9 |
| | Archive Lifecycle | 9 |
| 04. Security | Who Gets In | 10 |

Every lesson has:

- **A walkthrough.** An isometric scene that pans and zooms to the part each step explains, with animated events flowing between subsystems.
- **A step rail.** The narrative, a key-idea or watch-out callout, what changed since the last step, and a "You'll learn" checklist.
- **Try it.** A live simulation you can drive with sliders and toggles, such as the swinging-door compression chart or the buffer queues.
- **Docs links.** Every claim and link is checked against the official docs at [docs.aveva.com](https://docs.aveva.com/category/pi-system). The **Reference** page lists all sources by lesson.

The app also has keyboard shortcuts (`←` `→` to step, `R` to replay, `Space` to pause), progress saved in the browser, search (`Ctrl K`), a dark theme and a phone layout.

## Run it locally

You need Node 22.

```bash
cd module-3-4-exception-compression
npm ci
npm run dev      # then open http://localhost:5173/inside-pi/
npm run build    # type-check and build to dist/
```

## Project layout

```
.github/workflows/deploy.yml     build and publish to GitHub Pages
curriculum/                      the original curriculum outline
module-3-4-exception-compression/
  src/lessons/                   one file per lesson, plus index.ts (chapters and lesson order)
  src/components/iso/            the isometric kit: Block, Slab, Cylinder, Crowd, Pill, Gauge, Link, Flow, Stage
  src/components/shell/          top bar, course tree, lesson view, step rail, routing
  src/components/module*/        Try it simulations (ModuleCanvas.tsx and sim/ for exception & compression)
  src/index.css                  design tokens (light and dark) and layout
```

## Adding a lesson

1. Copy an existing file in `src/lessons/` (for example `data-pipeline.tsx`).
2. Fill in `steps`. Each step has a short label, title, tag, body paragraphs, an optional callout, what changed, and metric chips.
3. Draw the `Scene` with the iso kit. It receives the current `step`, so show, dim or move entities per step.
4. Set `camera`, which gives one `[x, y, zoom]` per step.
5. Register the lesson in `src/lessons/index.ts`.

Layout tips:
- Arrows look right when their last leg moves in −x or −y, so they land on a block's visible front faces.
- Space nodes about 7.5 grid units apart.
- Point the camera about 40–50 px above the node you're focusing on, because the metric chips cover the top of the stage.

## Deploy

Every push to `main` or `claude/aveva-pi-archive-curriculum-8fx6sb` runs `.github/workflows/deploy.yml`, which builds the app and publishes it to GitHub Pages under `/inside-pi/`.

## Credits

- The visual style is inspired by Dilum Sanjaya's [*designed-to-scale*](https://designed-to-scale.vercel.app/) system design course. It was rebuilt from scratch here; no code was copied.
- Icons: [Lucide](https://lucide.dev) (ISC). Font: [JetBrains Mono](https://www.jetbrains.com/lp/mono/) (OFL).
- AVEVA and PI System are trademarks of AVEVA Group. This is an independent learning project, not an official AVEVA product.
