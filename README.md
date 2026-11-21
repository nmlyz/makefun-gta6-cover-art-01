# Neon Vice Cover Studio

[![GTA 6 Cover Art](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/nmlyz/makefun-gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/nmlyz/makefun-gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Turn any photo into GTA 6-style cover art: a multi-panel neon poster with a
sunset grade, bold gradient caption lettering and a neon script subtitle,
exported as a share-ready PNG.

## Run

```sh
node serve.ts
```

Then open http://127.0.0.1:8123/ — no build step, no network requests, no
account. Everything runs offline in the browser.

## What it does

- **7 layouts** — 9-panel grid, hero + 3, 4-panel, tilted snapshot collage,
  full-bleed, 6-panel and duo split.
- **7 grades** — sunset, neon night, vice pink, teal dusk, mono noir,
  golden hour and magenta haze, applied as gradient-map tints over every panel.
- **Any photo** — two built-in sample photos plus your own uploads (file
  picker or drag-and-drop). Each panel has its own crop: drag to position,
  scroll to zoom, or use the zoom / offset sliders.
- **Caption editing** — editable big title (heavy system sans, gradient fill,
  dark outline, drop shadow), neon script subtitle, badge ribbon text and a
  5-star heat meter, all live on the canvas.
- **Procedural art** — the sunset sky, sun disc, neon skyline and palm
  silhouettes are drawn on canvas, so the poster looks finished even with a
  single photo. Grain, vignette and a halftone title block are toggleable.
- **Fast export** — one-click PNG at 1080×1080, 1080×1350, 1920×1080 or
  1080×1920 (story), plus “Export all sizes” in one go.
- **Undo / redo, randomize and reset** — every edit is reversible; randomize
  shuffles layout, grade, photos and caption styling.

## How it is built

Vanilla ES modules on a 2D canvas (`app/src/cover.js` is the render engine,
`app/src/app.js` the editor UI, `app/src/shots.js` the deterministic
screenshot scenes). No libraries, no vendored fonts — lettering uses system
font stacks only. Photos stay on your machine; nothing is uploaded anywhere.

## Screenshots

`screenshots/` holds the cover and editor views the entry is judged on,
rendered deterministically with `?shot=cover` / `?shot=editor` scenes.
