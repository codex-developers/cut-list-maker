// Turns a project's pieces into the groups and rows printed on the cutting sheet.
import { materialOf, type Piece, type Settings } from "./model";

export interface Row extends Piece {
  mat: string;
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

/** Identical pieces (same size, edges, material and, when the part column shows, same part) become one row. */
function mergeRows(list: Row[], byPart: boolean): Row[] {
  const out: Row[] = [];
  const byKey = new Map<string, Row>();
  for (const p of list) {
    const k = [byPart ? p.name : "", p.L, p.Le, p.W, p.We, p.mat].join("|");
    const hit = byKey.get(k);
    if (hit) hit.qty += p.qty;
    else { const r = { ...p }; byKey.set(k, r); out.push(r); }
  }
  return out;
}

const byLength = (a: Row, b: Row) => b.L - a.L || b.W - a.W || a.name.localeCompare(b.name);

export function buildGroups(pieces: Piece[], s: Settings): Group[] {
  const all: Row[] = pieces.map(p => ({ ...p, mat: materialOf(p, s) }));
  const prep = (list: Row[]) => (s.merge ? mergeRows(list, s.cols.part) : list.map(r => ({ ...r }))).sort(byLength);
  if (!s.group) return [{ mat: null, rows: prep(all), stats: stats(all) }];
  const mats = [...new Set(all.map(r => r.mat))].sort((a, b) => a.localeCompare(b));
  return mats.map(m => {
    const items = all.filter(r => r.mat === m);
    return { mat: m, rows: prep(items), stats: stats(items) };
  });
}

/** Materials that carry edge band somewhere in the project, for the band-width inputs. */
export function bandedMaterials(pieces: Piece[], s: Settings): string[] {
  const set = new Set(pieces.filter(p => p.Le || p.We).map(p => materialOf(p, s)));
  return [...set].sort((a, b) => a.localeCompare(b));
}
