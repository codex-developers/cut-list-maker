// Guillotine cutting optimizer: every cut runs straight through the current panel, as on a panel saw.
// Coordinates are millimetres inside the usable board area (after edge trim); x runs along the board length
// (and its grain), y along the board width.
import { matInfo, type Settings } from "./model";
import type { Row } from "./sheet";
import type { Shape } from "./shape";

export interface Rect { x: number; y: number; w: number; h: number }

export interface Placed extends Rect {
  nr: number;
  name: string;
  /** Piece sizes as on the cutting list. */
  L: number;
  W: number;
  /** true when the piece length runs across the board (along y). */
  turned: boolean;
  /** Custom cut drawn inside the rectangle. */
  shape?: Shape;
}

export interface Board {
  placed: Placed[];
  /** Leftover areas between cuts. */
  free: Rect[];
}

export interface MaterialPlan {
  mat: string;
  sheetL: number;
  sheetW: number;
  grain: boolean;
  boards: Board[];
  notFit: { nr: number; name: string; L: number; W: number; qty: number }[];
  /** Leftovers at least minOffcut on both sides, per board index. */
  offcuts: { board: number; rect: Rect }[];
  /** Share of the bought board area that ends up in pieces, 0–1. */
  used: number;
}

interface Item {
  nr: number;
  name: string;
  L: number;
  W: number;
  /** Allowed placements as [along x, along y, turned]. */
  orients: [number, number, boolean][];
  shape?: Shape;
}

type Fit = "area" | "short" | "long";
type Split = "shortAxis" | "longAxis" | "maxArea" | "rows" | "cols";

const SORTS: ((a: Item, b: Item) => number)[] = [
  (a, b) => b.L * b.W - a.L * a.W,
  (a, b) => Math.max(b.L, b.W) - Math.max(a.L, a.W) || Math.min(b.L, b.W) - Math.min(a.L, a.W),
  (a, b) => b.orients[0][0] - a.orients[0][0] || b.orients[0][1] - a.orients[0][1],
  (a, b) => b.orients[0][1] - a.orients[0][1] || b.orients[0][0] - a.orients[0][0],
  (a, b) => b.L + b.W - (a.L + a.W),
];
const FITS: Fit[] = ["area", "short", "long"];
const SPLITS: Split[] = ["shortAxis", "longAxis", "maxArea", "rows", "cols"];

function score(r: Rect, w: number, h: number, fit: Fit): [number, number] {
  const dw = r.w - w, dh = r.h - h;
  if (fit === "area") return [r.w * r.h - w * h, Math.min(dw, dh)];
  if (fit === "short") return [Math.min(dw, dh), Math.max(dw, dh)];
  return [Math.max(dw, dh), Math.min(dw, dh)];
}

/** The two leftovers after cutting a w × h piece from the corner of r. */
function split(r: Rect, w: number, h: number, kerf: number, rule: Split): Rect[] {
  const dw = r.w - w - kerf;
  const dh = r.h - h - kerf;
  // Across: the first cut runs the full width of r, leaving a full-width strip below.
  const across = [
    { x: r.x + w + kerf, y: r.y, w: dw, h },
    { x: r.x, y: r.y + h + kerf, w: r.w, h: dh },
  ];
  // Along: the first cut runs the full height of r, leaving a full-height strip beside.
  const along = [
    { x: r.x + w + kerf, y: r.y, w: dw, h: r.h },
    { x: r.x, y: r.y + h + kerf, w, h: dh },
  ];
  let useAcross: boolean;
  switch (rule) {
    case "shortAxis": useAcross = r.w - w <= r.h - h; break;
    case "longAxis": useAcross = r.w - w > r.h - h; break;
    case "rows": useAcross = true; break;
    case "cols": useAcross = false; break;
    default: {
      const big = (rs: Rect[]) => Math.max(...rs.map(q => (q.w > 0 && q.h > 0 ? q.w * q.h : 0)));
      useAcross = big(across) >= big(along);
    }
  }
  return (useAcross ? across : along).filter(q => q.w > 0 && q.h > 0);
}

function pack(items: Item[], bw: number, bh: number, kerf: number, fit: Fit, rule: Split) {
  const boards: Board[] = [];
  const notFit: Item[] = [];
  for (const it of items) {
    let best: { b: Board; i: number; o: [number, number, boolean]; s: [number, number] } | null = null;
    for (const b of boards) {
      b.free.forEach((r, i) => {
        for (const o of it.orients) {
          if (o[0] > r.w || o[1] > r.h) continue;
          const s = score(r, o[0], o[1], fit);
          if (!best || s[0] < best.s[0] || (s[0] === best.s[0] && s[1] < best.s[1])) best = { b, i, o, s };
        }
      });
    }
    if (!best) {
      const o = it.orients.find(o => o[0] <= bw && o[1] <= bh);
      if (!o) { notFit.push(it); continue; }
      const b: Board = { placed: [], free: [{ x: 0, y: 0, w: bw, h: bh }] };
      boards.push(b);
      best = { b, i: 0, o, s: [0, 0] };
    }
    const { b, i, o } = best as { b: Board; i: number; o: [number, number, boolean] };
    const r = b.free[i];
    b.placed.push({ x: r.x, y: r.y, w: o[0], h: o[1], turned: o[2], nr: it.nr, name: it.name, L: it.L, W: it.W, shape: it.shape });
    b.free.splice(i, 1, ...split(r, o[0], o[1], kerf, rule));
  }
  return { boards, notFit };
}

const areaOf = (b: Board) => b.placed.reduce((a, p) => a + p.w * p.h, 0);

/**
 * Plans every material in the project. `rows` are unmerged rows (one per piece entry);
 * `nrOf` gives the sheet row number for each.
 */
export function optimize(rows: Row[], nrOf: (r: Row) => number, s: Settings): MaterialPlan[] {
  const mats = [...new Set(rows.map(r => r.mat))].sort((a, b) => a.localeCompare(b));
  return mats.map(mat => {
    const info = matInfo(mat, s);
    const bw = info.sheetL - 2 * s.trim;
    const bh = info.sheetW - 2 * s.trim;
    const items: Item[] = [];
    for (const r of rows.filter(r => r.mat === mat)) {
      const L = r.cutL, W = r.cutW;
      if (!(L > 0 && W > 0)) continue;
      const straight: [number, number, boolean] = [L, W, false];
      const turned: [number, number, boolean] = [W, L, true];
      const orients = r.g === "L" ? [straight] : r.g === "W" ? [turned] : L === W ? [straight] : [straight, turned];
      for (let k = 0; k < r.qty; k++) items.push({ nr: nrOf(r), name: r.name, L, W, orients, shape: r.shape });
    }

    // Try every combination of order, fit and cut rule; keep the fewest boards, then the emptiest last board.
    let best: ReturnType<typeof pack> | null = null;
    let bestKey: [number, number] = [Infinity, Infinity];
    for (const sort of SORTS) {
      const sorted = [...items].sort(sort);
      for (const fit of FITS) for (const rule of SPLITS) {
        const res = pack(sorted, bw, bh, s.kerf, fit, rule);
        const key: [number, number] = [res.boards.length, res.boards.length ? areaOf(res.boards[res.boards.length - 1]) : 0];
        if (key[0] < bestKey[0] || (key[0] === bestKey[0] && key[1] < bestKey[1])) { best = res; bestKey = key; }
      }
    }
    const { boards, notFit } = best || { boards: [], notFit: [] };

    const nf = new Map<number, MaterialPlan["notFit"][number]>();
    for (const it of notFit) {
      const hit = nf.get(it.nr);
      if (hit) hit.qty++;
      else nf.set(it.nr, { nr: it.nr, name: it.name, L: it.L, W: it.W, qty: 1 });
    }
    const offcuts = boards.flatMap((b, i) =>
      b.free.filter(r => Math.min(r.w, r.h) >= s.minOffcut).map(rect => ({ board: i, rect })),
    );
    const placedArea = boards.reduce((a, b) => a + areaOf(b), 0);
    const bought = boards.length * info.sheetL * info.sheetW;
    return {
      mat, sheetL: info.sheetL, sheetW: info.sheetW, grain: info.grain,
      boards, notFit: [...nf.values()], offcuts, used: bought ? placedArea / bought : 0,
    };
  });
}
