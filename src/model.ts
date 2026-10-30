// Core data types. Sizes are in millimetres.

/** Edge band on a dimension: 0 none, 1 one side (—), 2 both sides (=). */
export type Edge = 0 | 1 | 2;

/**
 * Grain direction of a piece relative to its own sides:
 *   "L"    grain runs along the piece length (must follow the board's grain)
 *   "W"    grain runs along the piece width
 *   "free" no grain, the piece may be rotated
 */
export type Grain = "L" | "W" | "free";

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
  /** Material chosen in the editor; wins over the code mapping. */
  material?: string;
  /** Unset = follow the material (grain board -> "L", plain board -> "free"). */
  grain?: Grain;
}

export interface Project {
  id: string;
  name: string;
  note: string;
  pieces: Piece[];
  createdAt: number;
  updatedAt: number;
}

export interface Material {
  id: string;
  name: string;
  thickness: number;
  /** Board size; sheetL runs along the board's grain. */
  sheetL: number;
  sheetW: number;
  /** Wood decor whose pieces must keep their direction. */
  grain: boolean;
  /** Default edge band for this material; "" = none chosen. */
  bandId: string;
}

/** Edge band materials offered in Settings; extend this list to add more. */
export const BAND_TYPES = ["ABS", "PVC"] as const;
export type BandType = (typeof BAND_TYPES)[number];
export const DEFAULT_BAND_TYPE: BandType = "ABS";

export interface Band {
  id: string;
  type: BandType;
  label: string;
  width: number;
  thickness: number;
}

export interface Company {
  name: string;
  phone: string;
  address: string;
  /** data: URL of the logo image, "" = none. */
  logo: string;
}

export type Lang = "sq" | "mk" | "en";
export const LANGS: { id: Lang; label: string }[] = [
  { id: "sq", label: "Shqip" },
  { id: "mk", label: "Македонски" },
  { id: "en", label: "English" },
];

export type ColKey = "nr" | "len" | "wid" | "qty" | "mat" | "thick" | "band" | "grain" | "part";

export interface Settings {
  lang: Lang;
  group: boolean;
  merge: boolean;
  cols: Record<ColKey, boolean>;
  /** Export code -> material name. */
  codeMap: Record<string, string>;
  /** Part name -> material name, overrides the code. */
  partMap: Record<string, string>;
  materials: Material[];
  bands: Band[];
  company: Company;
  /** Subtract edge band thickness from the sizes sent to the factory. */
  deductBand: boolean;
  /** Saw blade thickness. */
  kerf: number;
  /** Trimmed off each board edge before cutting. */
  trim: number;
  /** Offcuts smaller than this on either side are counted as waste. */
  minOffcut: number;
  /** Add the optimizer's cutting diagrams to the printout. */
  printDiagrams: boolean;
}

export const uid = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);

const SHEET_L = 2800;
const SHEET_W = 2070;

export const DEFAULT_BANDS: Band[] = [
  { id: "b045", type: "ABS", label: "22 × 0,45 mm", width: 22, thickness: 0.45 },
  { id: "b08", type: "ABS", label: "22 × 0,8 mm", width: 22, thickness: 0.8 },
  { id: "b1", type: "ABS", label: "22 × 1 mm", width: 22, thickness: 1 },
  { id: "b2", type: "ABS", label: "22 × 2 mm", width: 22, thickness: 2 },
  { id: "b282", type: "ABS", label: "28 × 2 mm", width: 28, thickness: 2 },
];

export const DEFAULT_SETTINGS: Settings = {
  lang: "sq",
  group: true,
  merge: true,
  cols: { nr: true, len: true, wid: true, qty: true, mat: true, thick: true, band: true, grain: true, part: true },
  codeMap: { "": "Iveric 16mm Barok A427", "Colors\\White": "Iveric 16mm White" },
  partMap: { lesonit: "Lesonit 3mm White" },
  materials: [
    { id: "m1", name: "Iveric 16mm Barok A427", thickness: 16, sheetL: SHEET_L, sheetW: SHEET_W, grain: true, bandId: "" },
    { id: "m2", name: "Iveric 16mm White", thickness: 16, sheetL: SHEET_L, sheetW: SHEET_W, grain: true, bandId: "" },
    { id: "m3", name: "Lesonit 3mm White", thickness: 3, sheetL: SHEET_L, sheetW: SHEET_W, grain: false, bandId: "" },
  ],
  bands: DEFAULT_BANDS,
  company: { name: "", phone: "", address: "", logo: "" },
  deductBand: false,
  kerf: 4,
  trim: 10,
  minOffcut: 200,
  printDiagrams: false,
};

/** "22 × 0,8 mm" -> { width: 22, thickness: 0.8 } */
export function parseBandLabel(label: string): { width: number; thickness: number } {
  const m = label.match(/(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)/i);
  const n = (s: string) => parseFloat(s.replace(",", "."));
  return m ? { width: n(m[1]), thickness: n(m[2]) } : { width: 0, thickness: 0 };
}

/** Fills in anything missing from older saved settings and upgrades the first version's fields. */
export function normalizeSettings(raw: unknown): Settings {
  const s = (raw || {}) as Partial<Settings> & { bandMap?: Record<string, string>; from?: string };
  const d = DEFAULT_SETTINGS;
  const out: Settings = {
    ...d,
    ...s,
    cols: { ...d.cols, ...(s.cols || {}) },
    company: { ...d.company, ...(s.company || {}) },
    materials: (s.materials || d.materials).map(m => ({ ...m })),
    bands: (s.bands || d.bands).map(b => ({ ...b, type: BAND_TYPES.includes(b.type) ? b.type : DEFAULT_BAND_TYPE })),
  };
  if (!LANGS.some(l => l.id === out.lang)) out.lang = d.lang;

  // Version 1 kept band widths as free text per material and the orderer as one line.
  if (s.bandMap) {
    for (const [mat, text] of Object.entries(s.bandMap)) {
      if (!text.trim()) continue;
      let band = out.bands.find(b => b.label.trim() === text.trim());
      if (!band) { band = { id: uid(), type: DEFAULT_BAND_TYPE, label: text.trim(), ...parseBandLabel(text) }; out.bands.push(band); }
      ensureMaterial(out, mat).bandId = band.id;
    }
  }
  if (s.from && !out.company.name) out.company.name = s.from;
  delete (out as { bandMap?: unknown }).bandMap;
  delete (out as { from?: unknown }).from;
  return out;
}

export function newProject(name: string, pieces: Piece[] = []): Project {
  const now = Date.now();
  return { id: uid(), name, note: "", pieces, createdAt: now, updatedAt: now };
}

export function newPiece(patch: Partial<Piece> = {}): Piece {
  return { id: uid(), name: "", L: 0, W: 0, Le: 0, We: 0, qty: 1, code: "", ...patch };
}

// ---------- materials ----------

export function materialOf(p: Piece, s: Settings): string {
  return (p.material || "").trim() || (s.partMap[p.name] || "").trim() || (s.codeMap[p.code] || "").trim() || p.code || "—";
}

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export const findMaterial = (name: string, s: Settings) => s.materials.find(m => sameName(m.name, name));

/** Library entry for a material name, or sensible defaults read from the name ("Iveric 16mm …"). */
export function matInfo(name: string, s: Settings): Material {
  const found = findMaterial(name, s);
  if (found) return found;
  const t = name.match(/(\d+(?:[.,]\d+)?)\s*mm/i);
  return { id: "", name, thickness: t ? parseFloat(t[1].replace(",", ".")) : 16, sheetL: SHEET_L, sheetW: SHEET_W, grain: true, bandId: "" };
}

/** Returns the library entry for name, adding one (mutating s.materials) when missing. */
export function ensureMaterial(s: Settings, name: string): Material {
  const found = findMaterial(name, s);
  if (found) return found;
  const m = { ...matInfo(name, s), id: uid(), name: name.trim() };
  s.materials.push(m);
  return m;
}

/** "ABS 22 × 2 mm": the band as shown in lists and on the sheet. */
export function bandName(b: Band): string {
  return [b.type, b.label].filter(Boolean).join(" ");
}

export function bandOf(matName: string, s: Settings): Band | undefined {
  const id = findMaterial(matName, s)?.bandId;
  return id ? s.bands.find(b => b.id === id) : undefined;
}

export const hasEdge = (p: Piece) => p.Le > 0 || p.We > 0;

export function effectiveGrain(p: Piece, mat: Material): Grain {
  return p.grain ?? (mat.grain ? "L" : "free");
}

/** Size sent to the factory: the finished size, minus band thickness when that setting is on. */
export function cutSize(p: Piece, s: Settings, matName = materialOf(p, s)): { L: number; W: number } {
  if (!s.deductBand) return { L: p.L, W: p.W };
  const t = bandOf(matName, s)?.thickness || 0;
  const r = (v: number) => Math.round(v * 10) / 10;
  return { L: r(p.L - p.Le * t), W: r(p.W - p.We * t) };
}

/** Whether a piece fits on its board at all, given its grain. */
export function fitsBoard(p: Piece, s: Settings): boolean {
  const name = materialOf(p, s);
  const mat = matInfo(name, s);
  const { L, W } = cutSize(p, s, name);
  const bl = mat.sheetL - 2 * s.trim;
  const bw = mat.sheetW - 2 * s.trim;
  const g = effectiveGrain(p, mat);
  const straight = L <= bl && W <= bw;
  const turned = W <= bl && L <= bw;
  return g === "L" ? straight : g === "W" ? turned : straight || turned;
}
