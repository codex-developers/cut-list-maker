# Lista e prerjes

Turns the piece list exported from the furniture drawing program into a clean A4 cutting list for the cutting factory. Albanian, Macedonian and English.

Runs fully in the browser. Projects and settings are stored in the browser's IndexedDB; use **Download backup** on the home screen to keep a copy.

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

## Layout

- `src/model.ts` – data types and defaults
- `src/parse.ts` – reading the exported `.txt`
- `src/sheet.ts` – grouping, merging and totals for the printed sheet
- `src/storage.ts` – IndexedDB and backup files
- `src/i18n.ts` – all texts in three languages
- `src/components/` – screens (`Home`, `ProjectView`) and the printable `CutSheet`
