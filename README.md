# Lista e prerjes

Turns furniture piece lists into a clean A4 cutting list for the cutting factory, with cutting diagrams. Albanian, Macedonian and English.

It runs fully in the browser and can be installed as an app (works offline). Projects and settings are stored in the browser's IndexedDB; use **Download backup** on the home screen to keep a copy or move to another PC.

## Features

- **Projects:** create, rename, duplicate, delete, autosave, backup/restore.
- **Pieces:** import the exported `.txt`, or add and edit pieces in a table (undo/redo, Enter adds a row).
- **Grain:** per piece ↕ along length, ↔ along width, ∅ free, or follow the material.
- **Cutting sheet:** grouped by material, identical pieces merged, choose which columns print, workshop header with logo.
- **Settings:** material library (board size, thickness, grain, default edge band), edge bands, kerf, edge trim, minimum offcut, optional subtraction of band thickness from cut sizes.
- **Cutting diagrams:** guillotine optimizer that respects grain, kerf and trim; boards needed, waste %, usable offcuts; can be printed after the list.

## Piece list format

Tab-separated, one piece per line, as exported (Windows-1252 or UTF-8):

```
name    length  width   qty   material code
ansore  1584—   384—    2
dyer    2030=   398=    3     Colors\White
```

`—` after a size = edge band on one side, `=` = both sides, no mark = none.

## Develop

```bash
npm install
npm run dev
```

`npm run build` type-checks and writes the static site to `dist/`.

## Publish on GitHub Pages

1. Push this repository to GitHub (branch `main`).
2. On GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Every push to `main` runs `.github/workflows/deploy.yml` and publishes the app at `https://<user>.github.io/<repo>/`.

## Layout

- `src/model.ts` – data types, defaults, material/grain/cut-size rules
- `src/parse.ts` – reading the exported `.txt`
- `src/sheet.ts` – grouping, merging, row numbers and totals for the printed sheet
- `src/optimizer.ts` – guillotine cutting optimizer
- `src/storage.ts` – IndexedDB and backup files
- `src/i18n.ts` – all texts in three languages
- `src/components/` – screens (`Home`, `ProjectView`, `SettingsView`), `PieceEditor`, printable `CutSheet` and `Plan` diagrams
