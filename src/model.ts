// Core data types. Sizes are in millimetres.

/** Edge band on a dimension: 0 none, 1 one side (—), 2 both sides (=). */
export type Edge = 0 | 1 | 2;

export interface Piece {
  id: string;
  /** Part name from the drawing, e.g. "ansore", "kapak". */
  name: string;
  L: number;
  W: number;
  Le: Edge;
  We: Edge;
  qty: number;
  /** Material code from the export, e.g. "" or "Colors\\White". */
  code: string;
}

export interface Project {
  id: string;
  name: string;
  note: string;
  pieces: Piece[];
  createdAt: number;
  updatedAt: number;
}

export type Lang = "sq" | "mk" | "en";
export const LANGS: { id: Lang; label: string }[] = [
  { id: "sq", label: "Shqip" },
  { id: "mk", label: "Македонски" },
  { id: "en", label: "English" },
];

export type ColKey = "nr" | "len" | "wid" | "qty" | "mat" | "band" | "part";

export interface Settings {
  lang: Lang;
  group: boolean;
  merge: boolean;
  cols: Record<ColKey, boolean>;
  /** Export code -> full material name. */
  codeMap: Record<string, string>;
  /** Part name -> material, overrides the code. */
  partMap: Record<string, string>;
  /** Material name -> edge band width text. */
  bandMap: Record<string, string>;
  /** Who orders: printed on every sheet. */
  from: string;
}

export const DEFAULT_SETTINGS: Settings = {
  lang: "sq",
  group: true,
  merge: true,
  cols: { nr: true, len: true, wid: true, qty: true, mat: true, band: true, part: true },
  codeMap: { "": "Iveric 16mm Barok A427", "Colors\\White": "Iveric 16mm White" },
  partMap: { lesonit: "Lesonit 3mm White" },
  bandMap: {},
  from: "",
};

/** Fills in anything missing from older saved settings. */
export function normalizeSettings(s: Partial<Settings> | undefined): Settings {
  const d = DEFAULT_SETTINGS;
  const out: Settings = { ...d, ...(s || {}) };
  out.cols = { ...d.cols, ...(s?.cols || {}) };
  if (!LANGS.some(l => l.id === out.lang)) out.lang = d.lang;
  return out;
}

export const uid = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);

export function newProject(name: string, pieces: Piece[] = []): Project {
  const now = Date.now();
  return { id: uid(), name, note: "", pieces, createdAt: now, updatedAt: now };
}

export function materialOf(p: Piece, s: Settings): string {
  return (s.partMap[p.name] || "").trim() || (s.codeMap[p.code] || "").trim() || p.code || "—";
}

export const hasEdge = (p: Piece) => p.Le > 0 || p.We > 0;
