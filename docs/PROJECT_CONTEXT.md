# Cut List Maker – project context

This document gives an assistant everything needed to continue work on Cut List Maker: what it is for, how it works, decisions already made and what is still open. Last updated 30.10.2026.

## Who it is for and why

- The owner (Veton) designs and builds furniture. For each job, the drawing program exports a **piece list**, and the pieces are cut by an outside **cutting factory**.
- Cut List Maker turns that raw export into a clean, printable A4 **cutting list** to send to the factory.
- It has grown into a small app the owner wants to use for many jobs: saved projects, editing pieces, materials, edge band and a board-cutting optimizer.
- The owner works in **Albanian**, also deals in **Macedonian**, and wants **English** available. The app supports all three.
- **Preferred way of working:** plan first, build phase by phase, then the owner tests in Chrome at the end. Keep explanations short and practical.

## The raw piece list (input format)

Tab-separated, one piece per line, no header:

```
name <TAB> length <TAB> width <TAB> quantity <TAB> material code
```

Example (from the "paradhoma" job, an entrance-hall wardrobe):

```
ansore	1584—	384—	2
ansore	2000—	560  	3
bithore	1600  	1200  	1
dyer	2030=	398=	3	Colors\White
kapak	200—	560=	2
lesonit	2030  	198  	1	Colors\White
```

- Sizes are in **millimetres**. The first size is the length, the second the width.
- A mark right after a size is the **edge band** on that dimension:
  - `—` (em dash) = band on **one side**
  - `=` = band on **both sides**
  - no mark (just spaces) = no band
- **Encoding:** the export is **Windows-1252**, not UTF-8. The em dash is the single byte `0x97`; read as UTF-8 it shows as `�`. The parser tries UTF-8 first and falls back to Windows-1252. It also accepts `–`, `-` and `�` as "one side".
- **Material code** is empty for the main board of the job, or a value like `Colors\White`.
  - In paradhoma, empty = *Iveric 16mm Barok A427* (wood decor).
  - `Colors\White` is used both for doors (`dyer`, 16 mm white board) and back panels (`lesonit`, 3 mm HDF). So the material sometimes has to be set **per part name** rather than per code.
- Part names are Albanian workshop terms:
  - *ansore* = side panel
  - *bithore* = bottom
  - *dyer* = doors
  - *kapak* = lid / front
  - *lesonit* = HDF back panel
  - *ndarse* = divider
  - *polic* = shelf
  - *nalt* = top
  - *fjoke* = small piece

## What the app does today

**Projects (home screen)**
- Create, rename, duplicate and delete projects (delete asks for confirmation).
- Autosave while typing.
- Drop a `.txt` on the home screen to create a project from it.
- **Download backup / Restore backup** as one JSON file. All data lives only in the browser (IndexedDB), so backup is the only way to move data or keep it safe.
- On first run, the paradhoma list is added as an example project.

**Project screen: left panel**
- Order: project name and a note for the factory.
- Import a `.txt`, or paste text. If the project already has pieces, the app asks whether to **replace** them or **add** to them.
- **Material codes:** which material each code means, plus a per-part-name override.
- **Edge band:** which band each material uses.
- View options:
  - group by material
  - merge identical pieces
  - add cutting diagrams to the printout
  - language
  - which columns to show
- **Print / Save PDF** prints only the A4 sheet. To email it, choose "Save as PDF" in the print dialog.

**Project screen: three tabs**
1. **Pieces (editor).**
   - Inline table: name, length, edge band (∅ / — / =), width, edge band, quantity, material, grain.
   - Duplicate or delete a row. Enter on the last row adds a new one.
   - Undo/redo with buttons or Ctrl+Z / Ctrl+Y.
   - Invalid values are outlined red. A piece that doesn't fit on its board is highlighted.
2. **Sheet** (the printable cutting list):
   - Workshop header with logo, name, phone and address, plus the date.
   - Grouped by material, longest pieces first, numbered rows.
   - Columns: Nr., Length, Width, Qty, Material, Band, Grain, Part. Each can be shown or hidden.
   - Each group shows pieces, m² of board and metres of edge band, with a grand total at the bottom.
   - A legend explains the — / = / ↕ / ↔ marks.
3. **Cutting diagrams** (optimizer output):
   - One diagram per board, per material. Pieces are numbered with the **same row numbers as the cutting list**, and show their sizes when there's room.
   - Waste is hatched; usable offcuts are dashed green with their size.
   - An arrow shows the board's grain direction.
   - Summary per material: boards needed, % used, % waste, usable offcuts, and any pieces too big to fit.

**Custom cuts (shapes)**
- The **Forma** button on a piece row opens the shape dialog. Shapes: corners and sides (angled corner cut with two sizes, rounded corner with a radius, sides with an arc out or in), ellipse/circle filling the rectangle, or free points (x along the length, y along the width, clockwise).
- Edge band on a shaped piece is set per edge by clicking the drawing; band metres use the real edge lengths. The row's — / = marks are not used then, and band thickness is never deducted (the rectangle is cut first).
- Each shape can carry a note for the factory and an attached drawing (pick, paste with Ctrl+V or drop a Pro100 screenshot).
- On the cutting list shaped pieces get their own **Custom cuts** section after the others, one card each with a dimensioned drawing; they never merge. The optimizer still plans the rectangle; the diagrams draw the shape inside it.
- Code: `src/shape.ts` (geometry), `components/ShapeDialog.tsx`, `components/ShapeView.tsx`.

**Grain direction per piece**
- `↕` = grain along the piece length; the length must follow the board's grain.
- `↔` = grain along the width.
- `∅` = no grain; the piece may be rotated.
- **auto** (the default, shown dashed) = follow the material. A material with grain gives ↕; a plain one gives ∅.
- The toggle cycles auto → ↕ → ↔ → ∅.

**Settings page**
- Workshop name, phone, address and logo (the logo is shrunk before saving).
- **Material library:**
  - fields: name, thickness, board size (length × width, length = grain direction), has grain, default edge band
  - defaults: *Iveric 16mm Barok A427* (grain), *Iveric 16mm White*, *Lesonit 3mm White*, all on 2800 × 2070 boards
- **Edge band library:** label, width, thickness. Defaults: 22×0,45 / 22×0,8 / 22×1 / 22×2 / 28×2 mm.
- **Cutting:**
  - saw blade thickness (kerf, default 4 mm)
  - edge trim per board side (default 10 mm)
  - minimum offcut worth keeping (default 200 mm)
  - **subtract edge band thickness from sizes**, off by default: e.g. `600=` with a 2 mm band prints as `596`, and the sheet adds a note saying so
- Defaults for the sheet layout: grouping, merging, diagrams in print, visible columns.

**Optimizer**
- **Guillotine** cutting: every cut runs edge to edge, as on a panel saw.
- Respects grain, kerf and edge trim.
- Tries 5 orderings × 3 fit rules × 5 cut rules (75 runs). It keeps the result with the fewest boards, then the emptiest last board.
- Tested:
  - paradhoma: 61 pieces, no overlaps, 3 Barok boards at about 89% use
  - 807 random pieces: about 0.3 s, about 93% use, grain always respected

**App**
- Installable (PWA) and works offline. Google Fonts are cached too.
- Works at phone width; the main content comes first and the side panel moves below it.

## Decisions already made

- **Name:** *Cut List Maker* in English everywhere: app title, browser tab, installed app, package `cut-list-maker`, repo.
  - The printed sheet heading stays translated: *Lista e prerjes* / *Листа за сечење* / *Cutting list*.
  - Internal storage keys and the backup file tag still say `lista-e-prerjes`, so older data keeps loading. Don't rename them without a migration.
- **No backend.** Everything stays in the browser (IndexedDB), with JSON backup.
- **Hosting:** GitHub Pages, deployed by GitHub Actions on every push to `main`.
- **Edge band deduction** is a setting, off by default, because factories differ.
- **The workshop's own name and phone** live in Settings, not in each project. An older "ordered by" field was migrated into the workshop name.
- **Edge band marks** on the sheet stay exactly as in the export: `—` one side, `=` two sides.
- **Default board size** is 2800 × 2070 mm and can be changed per material.
- **Numbers** use a decimal comma (`350,5`) in all languages; a dot is accepted when typing.
- **Dates** are written dd.mm.yyyy.
- **Macedonian quantity header** is "Кол." because "Количина" didn't fit the column.

## Technical overview

- **Stack:** Vite 8, Preact 11, TypeScript 7, idb-keyval, vite-plugin-pwa.
- **Fonts:** Golos Text (covers Latin and Cyrillic) and IBM Plex Mono for numbers.
- **Local folder:** `C:\Other projects\lista-e-prerjes`. It keeps its old name; only the app was renamed.
- **Repo:** https://github.com/codex-developers/cut-list-maker (private, branch `main`).
- **Live site, once Pages is on:** https://codex-developers.github.io/cut-list-maker/
- **Commands:** `npm install`, `npm run dev`, `npm run build` (type-checks, then builds into `dist/`).
- **Routes** (hash based, so they work on Pages): `#/` projects, `#/p/<id>` a project, `#/settings`.

Files:

| File | Role |
| --- | --- |
| `src/model.ts` | Types (`Piece`, `Project`, `Material`, `Band`, `Settings`), defaults, migration of old settings, material lookup, `effectiveGrain`, `cutSize` (band deduction), `fitsBoard` |
| `src/parse.ts` | `.txt` parsing and Windows-1252 decoding |
| `src/sheet.ts` | Rows for the sheet: grouping, merging (`mergeKey`), row numbers, totals |
| `src/optimizer.ts` | Guillotine optimizer, a pure function, easy to test |
| `src/storage.ts` | IndexedDB stores, first-run flag, backup/restore |
| `src/i18n.ts` | All texts in `sq`, `mk`, `en`. Every new text needs all three |
| `src/components/` | `Home`, `ProjectView` (panel + tabs + print area), `PieceEditor`, `CutSheet`, `Plan` (SVG diagrams), `SettingsView`, `NumInput` |
| `.github/workflows/deploy.yml` | Build and deploy to Pages |

Implementation notes:
- **Printing:** a hidden `.print-only` block always holds the cutting list (plus the diagrams when that option is on). Screen-only parts are hidden in print. The A4 page is set with `@page`.
- **A piece's material** is decided in this order:
  1. the material set on the piece in the editor
  2. the per-part-name override
  3. the code mapping
  4. the raw code
- **Testing:** use the dev server, not a `file://` page. Some embedded browsers show local files as a static snapshot without running scripts.

## History

1. Started as one standalone HTML file that formatted the raw list into a printable table. Then added a band-width column, Macedonian, and show/hide columns.
2. The owner asked to make it scalable. The agreed plan, built in phases:
   - Phase 1: projects and storage
   - Phase 2: piece editor
   - Phase 3: grain column
   - Phase 4: settings
   - Phase 5: optimizer
   - then PWA and hosting
3. All phases were built and tested, then the app was renamed Cut List Maker and pushed to GitHub.

Commits so far: Phase 1 → Phases 2–5 → PWA and Pages deploy → rename → merge of GitHub's placeholder README.

## Open items / next steps

- **Turn on GitHub Pages:** on GitHub, Settings → Pages → Source: **GitHub Actions**, then run the "Deploy to GitHub Pages" workflow from the Actions tab if it hasn't run.
- **Private repo:** Pages needs a paid GitHub plan, or the repo made public. Projects are never uploaded either way.
- **Owner testing:** the end-to-end test in Chrome is still to do, including a real print / Save as PDF, since the print dialog couldn't be checked automatically.
- **Settings to enter once on the live site:**
  - workshop name, phone and logo
  - real material names and edge bands
  - check board sizes with the factory, or bring them over with a backup
- **Possible later ideas** (not requested yet):
  - per-part edge band if one material needs two band widths
  - CSV/Excel export for the factory
  - labels with piece numbers
  - grain-matched door sets
