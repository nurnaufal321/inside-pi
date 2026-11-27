---
name: inside-pi-lesson
description: Research, build and verify a lesson (or a whole chapter) for the Inside PI interactive isometric course, grounded in the PI docs MCP. Use when the user asks to add, build, write or plan a lesson, module or chapter for Inside PI, to cover a new PI System product area (AF, Analytics, interfaces, connectors, PI Vision, PI Web API…), or to continue the curriculum roadmap.
---

# Building an Inside PI lesson

Inside PI is a React and Vite app in `module-3-4-exception-compression/`. Each lesson is an isometric walkthrough plus a live "Try it" simulation. Every claim has to trace back to a docs.aveva.com page. This skill is the pipeline for adding one lesson, or planning one chapter, without drifting from that standard.

Read these first:
- `curriculum/ROADMAP.md`: the chapters, lesson ids, bundles and status.
- `docs/iso-kit.md`: the drawing primitives, layout rules, Try-it kit and step format.
- `module-3-4-exception-compression/src/lessons/data-pipeline.tsx` and `src/components/tryit/pipeline.tsx`: the reference lesson and its sim.

## Hard rules
- **No facts from memory.** Every technical statement in `steps`, `callout` and the sim's hints must come from a page fetched in this session with `mcp__pi-docs__get_page`. If the docs don't say it, leave it out or ask.
- **Every `docs[]` URL** must be a page returned by `mcp__pi-docs__search_pi_docs` and opened with `get_page`. No guessed page numbers.
- **Stop for approval** after the outline (stage 2). Build nothing before the user agrees.
- Lesson ids are permanent once shipped, because browser progress is keyed on them.
- Commit at the end of each stage, on a feature branch, never on the deploy branch.

## Chapter mode (a whole roadmap chapter)
Use this when the user asks to plan or start a chapter.
1. Look up the chapter's bundles in `ROADMAP.md`. Run 4–8 `search_pi_docs` queries per bundle (overview, architecture, configuration, troubleshooting, limits) and `get_page` the strongest hits.
2. Choose 3–5 lessons. Each one is a single mechanism a learner can watch happen; if a topic has nothing that moves, merge it into another lesson. The long tail (individual connectors and interfaces) goes in as links from the pattern lesson.
3. Write `curriculum/NN-<chapter-id>.md` with one short module per lesson (the format is in stage 2). Update `ROADMAP.md`: real lesson titles, ids, status ⏳.
4. Show the user the lesson list and get approval. Then run lesson mode for each lesson in order.

## Lesson mode

### 1. Research
- Run `mcp__pi-docs__search_pi_docs` with `bundle` set to each relevant bundle ID, then `get_page` (with `max_chars` up to 12000) for each candidate page.
- For the gotcha step, use `mcp__pi-kb__search_pi_kb` for real-world failure modes. If the KB isn't signed in, say so and use the troubleshooting pages from the docs.
- Keep a list of `fact → URL` pairs. You need at least 2 distinct pages for `docs[]`.

### 2. Module spec and outline (needs approval)
Add the module to `curriculum/NN-<chapter-id>.md` in the same six sections as the original curriculum:
1. **Core Concept**: 2–3 sentences.
2. **Verified PI Technical Facts (from MCP)**: bullets, each with its docs URL.
3. **Interactive Visual Scene**: the nodes (Block, Cylinder…), their tints, the paths and what flows on each.
4. **Interactive Controls ("Play With It")**: Try-it sliders, toggles and 2–5 scenarios, and what each one teaches.
5. **Step-by-Step Guided Walkthrough**: 7–10 steps, each with short label · title · tag · one-line point. It ends with a recap.
6. **Real-World Engineering Gotcha**: one, sourced.

Show the user the step list, a node and path sketch, and the scenarios. Wait for their yes.

### 3. Scaffold
From `module-3-4-exception-compression/`:
```bash
npm run new-lesson -- <chapter-id> <lesson-id> "<Lesson title>" "<Chapter title>"
```
This creates `src/lessons/<id>.tsx` and `src/components/tryit/<id>.tsx` from `templates/` and registers both, plus the chapter if it is new, in `src/lessons/index.ts`.

### 4. Build
- **Steps.** Write them from the spec. Use `` `code` `` for attribute, process and setting names and `*emphasis*` for defined terms. Keep body text to 1–3 short paragraphs, and give each step 2–4 metrics.
- **Scene.** Use only kit primitives (`docs/iso-kit.md`). Nodes are about 7.5 units apart, and each arrow's last leg moves in −x/−y. Reveal nodes progressively with `dim={step < k}` or `show`, and `glow` the node each step is about.
- **Camera.** Give one `[x, y, zoom]` per step, aimed 40–50 px above the focus node. The recap zooms out to the whole scene (about 0.9–1.0).
- **`learn`.** 4–6 items, each with `at` set to the step that teaches it.
- **Try it.** Export the scene layout as `LAYOUT` from the lesson, so the sim reuses the same coordinates. Write a real model of the mechanism (not just decoration), and give it scenarios that show both the normal case and a "break something" case. Log meaningful events to the event log.
- Use distinct lucide-react icons, and check that each one exists in the installed version (`node_modules/lucide-react`).

Lessons from the pilot (`af-elements-templates`):
- A **grid** of nodes (for example 3 columns × 3 rows) needs more room than a single row. Use about 12 units between columns and 9 between rows, or diagonal neighbours overlap on screen.
- Only label one node in a repeated row (for example `elements` under P-101), not every one.
- Long code pills (configuration strings) go *below* their node (`x={14} y={78}`, under the BOTTOM pill), not in the TOP slot, where they collide with neighbours.
- Arrows must point the way the packets move. Reviewers notice dots flowing against an arrow straight away.
- Label each PI component the scene shows (PI Data Archive, PI AF Server, interface node…) with a floor slab and a dark pill. Don't leave the reader to infer it.
- Check at narrow width that no pill is clipped or covered, and that no node has a stray icon the others in its row lack.
- Don't put a claim in the Try-it log that the docs don't make (for example what Reset to Template does to extensions).

### 5. Verify
From `module-3-4-exception-compression/`:
```bash
npm run check
npm run build
```
Both must pass; `check` rejects leftover TODOs, bad `learn.at` values, missing recap steps and non-docs URLs.

Then start the dev server (`npx vite --port 5173` in the background, or the `inside-pi` entry in `.claude/launch.json`) and open `http://localhost:5173/inside-pi/#/<id>/1` in the in-app browser. Step routes are 1-based, and the Try it is `#/<id>/try`. Then:
- Step through every step (`#/<id>/<n>`). Check that the focus node is in frame, no pill overlaps another, and no arrow crosses a block face.
- Open Try it, run each scenario, and check that the metrics and log react.
- Repeat at phone width (`resize_window` mobile) and in dark theme.
- Fix the scene or camera and look again. Report anything you couldn't fix.

### 6. Ship
- Update `README.md` (the course table and lesson count) and `curriculum/ROADMAP.md` (status ✅).
- The Reference page reads `docs[]` automatically, so it needs no edit.
- Commit with a message naming the lesson. Push the feature branch and open a PR into `claude/aveva-pi-archive-curriculum-8fx6sb` (the deploy branch) when the user asks to publish.
