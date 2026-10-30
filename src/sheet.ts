// Turns a project's pieces into the groups and rows printed on the cutting sheet.
import { cutSize, effectiveGrain, materialOf, matInfo, pieceBand, type Grain, type Piece, type Settings } from "./model";

export interface Row extends Piece {
  mat: string;
  /** Sizes sent to the factory (band thickness subtracted when that setting is on). */
  cutL: number;
  cutW: number;
  g: Grain;
  /** Row number on the printed sheet, 1-based, counted across groups. */
  nr: number;
}

export interface Group {
  /** null when grouping is off. */
  mat: string | null;
  rows: Row[];
  stats: Stats;
}

export interface Stats {
  pcs: number;
  /** m² of board */
  area: number;
  /** metres of edge band */
  edge: number;
}

export function stats(list: Piece[]): Stats {
  let pcs = 0, area = 0, edge = 0;
  for (const p of list) {
    pcs += p.qty;
    area += (p.L * p.W * p.qty) / 1e6;
    edge += ((p.L * p.Le + p.W * p.We) * p.qty) / 1000;
  }
  return { pcs, area, edge };
}

export function toRow(p: Piece, s: Settings): Row {
  const mat = materialOf(p, s);
  const c = cutSize(p, s, mat);
  return { ...p, mat, cutL: c.L, cutW: c.W, g: effectiveGrain(p, matInfo(mat, s)), nr: 0 };
}

/** Pieces with the same key print as one row when merging is on. */
export function mergeKey(r: Row, s: Settings): string {
  if (!s.merge) return r.id;
  const band = r.Le || r.We ? pieceBand(r, s, r.mat)?.id ?? "" : "";
  return [s.cols.part ? r.name : "", r.L, r.Le, r.W, r.We, r.mat, r.g, band].join("|");
}

const byLength = (a: Row, b: Row) => b.L - a.L || b.W - a.W || a.name.localeCompare(b.name);

export function buildGroups(pieces: Piece[], s: Settings): Group[] {
  const all = pieces.filter(p => p.L > 0 && p.W > 0 && p.qty > 0).map(p => toRow(p, s));
  const prep = (list: Row[]) => {
    const out: Row[] = [];
    const byKey = new Map<string, Row>();
    for (const r of list) {
      const k = mergeKey(r, s);
      const hit = byKey.get(k);
      if (hit) hit.qty += r.qty;
      else { const c = { ...r }; byKey.set(k, c); out.push(c); }
    }
    return out.sort(byLength);
  };
  const groups: Group[] = s.group
    ? [...new Set(all.map(r => r.mat))].sort((a, b) => a.localeCompare(b)).map(m => {
        const items = all.filter(r => r.mat === m);
        return { mat: m, rows: prep(items), stats: stats(items) };
      })
    : [{ mat: null, rows: prep(all), stats: stats(all) }];
  let nr = 0;
  for (const g of groups) for (const r of g.rows) r.nr = ++nr;
  return groups;
}

/** Maps each piece to its row number on the sheet, so the diagrams can show the same numbers. */
export function rowNumbers(groups: Group[], s: Settings): Map<string, number> {
  const out = new Map<string, number>();
  for (const g of groups) for (const r of g.rows) out.set(mergeKey(r, s), r.nr);
  return out;
}

/** Materials that carry edge band somewhere in the project. */
export function bandedMaterials(pieces: Piece[], s: Settings): string[] {
  const set = new Set(pieces.filter(p => p.Le || p.We).map(p => materialOf(p, s)));
  return [...set].sort((a, b) => a.localeCompare(b));
}
