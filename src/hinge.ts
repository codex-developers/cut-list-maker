// Hinge cup holes (35 mm) drilled by the cutting factory.
//
// A hinged piece is drawn standing up, seen from the inside face where the cups are drilled:
// its length L runs top to bottom and its width W left to right. Hinges sit on one edge:
//   "l" / "r"  along the left or right edge (normal doors), positions counted from the top
//   "t" / "b"  along the top or bottom edge (flaps), positions counted from the left

export type HingeSide = "l" | "r" | "t" | "b";
export const HINGE_SIDES: HingeSide[] = ["l", "r", "t", "b"];

export interface Hinges {
  side: HingeSide;
  /** Number of hinges; 0 = automatic from the edge length. */
  count: number;
  /** Distance from each end of the edge to the first and last cup centre. */
  end: number;
  /** Distance from the edge to the cup centre. */
  edge: number;
  /** Cup centres typed by hand, measured from the top (l/r) or left (t/b) end; wins over count and end. */
  custom?: number[];
}

export interface HingeDefaults {
  /** Cup diameter, usually 35. */
  dia: number;
  /** Drilling depth. */
  depth: number;
  edge: number;
  end: number;
}

export const DEFAULT_HINGE: HingeDefaults = { dia: 35, depth: 13, edge: 22.5, end: 100 };

export function newHinges(d: HingeDefaults, side: HingeSide = "l"): Hinges {
  return { side, count: 0, end: d.end, edge: d.edge };
}

/** Length of the edge the hinges sit on. */
export const hingeEdgeLen = (h: Hinges, L: number, W: number) => (h.side === "l" || h.side === "r" ? L : W);

/** Usual number of hinges for a door edge of this length. */
export function autoCount(len: number): number {
  return len <= 900 ? 2 : len <= 1600 ? 3 : len <= 2000 ? 4 : 5;
}

export function hingeCount(h: Hinges, L: number, W: number): number {
  return h.custom?.length || h.count || autoCount(hingeEdgeLen(h, L, W));
}

const r1 = (v: number) => Math.round(v * 10) / 10;

/** Cup centres along the edge, from the top (l/r) or left (t/b) end. */
export function hingePositions(h: Hinges, L: number, W: number): number[] {
  if (h.custom?.length) return [...h.custom].sort((a, b) => a - b);
  const len = hingeEdgeLen(h, L, W);
  const n = hingeCount(h, L, W);
  if (n === 1) return [r1(len / 2)];
  const step = (len - 2 * h.end) / (n - 1);
  return Array.from({ length: n }, (_, i) => r1(h.end + i * step));
}

/** Cup centres as [x across the width, y down the length] in the standing view. */
export function hingeHoles(h: Hinges, L: number, W: number): [number, number][] {
  const pos = hingePositions(h, L, W);
  switch (h.side) {
    case "l": return pos.map(p => [h.edge, p]);
    case "r": return pos.map(p => [W - h.edge, p]);
    case "t": return pos.map(p => [p, h.edge]);
    case "b": return pos.map(p => [p, L - h.edge]);
  }
}

/** Same drilling = same key, so identical doors still merge into one row. */
export const hingeKey = (h: Hinges | undefined, L: number, W: number) =>
  h ? `${h.side}:${h.edge}:${hingePositions(h, L, W).join(",")}` : "";

/** Positions that fall outside the edge or overlap the next cup. */
export function hingeProblem(h: Hinges, L: number, W: number, dia: number): boolean {
  const len = hingeEdgeLen(h, L, W);
  const across = h.side === "l" || h.side === "r" ? W : L;
  const pos = hingePositions(h, L, W);
  if (h.edge < dia / 2 || h.edge > across - dia / 2) return true;
  return pos.some((p, i) => p < dia / 2 || p > len - dia / 2 || (i > 0 && p - pos[i - 1] < dia));
}
