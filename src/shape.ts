// Custom piece shapes cut out of the piece's rectangle: corner cuts, rounded corners, curved sides,
// an ellipse, or a free outline of points. The factory cuts the rectangle first, then the shape, so
// the optimizer keeps planning the rectangle and only the drawings and edge band use the outline.
//
// Coordinates are millimetres inside the rectangle: x along the piece length (0..L), y along the
// width (0..W), y pointing down as on screen. Outlines run clockwise from the top-left corner.

export type Corner = "tl" | "tr" | "br" | "bl";
export type Side = "t" | "r" | "b" | "l";
export const CORNERS: Corner[] = ["tl", "tr", "br", "bl"];
export const SIDES: Side[] = ["t", "r", "b", "l"];

/** a = how far the cut runs along the length, b = along the width. */
export type CornerMod = { kind: "cut"; a: number; b: number } | { kind: "round"; r: number };

export type ShapeKind = "rect" | "ellipse" | "poly";

export interface Shape {
  kind: ShapeKind;
  corners: Partial<Record<Corner, CornerMod>>;
  /** Curved sides: arc depth in mm. + bulges out (the side's ends move in), − is cut in. */
  arcs: Partial<Record<Side, number>>;
  /** Free outline for kind "poly", [x, y] clockwise. */
  points: [number, number][];
  /** Which edges carry band, by edge key (see Seg.key). */
  band: Record<string, boolean>;
  /** Note for the factory. */
  note: string;
  /** data: URL of an attached drawing, "" = none. */
  image: string;
}

export type Pt = [number, number];

/** One edge of the outline: a straight line, or a circular arc when s ≠ 0. */
export interface Seg {
  /** Stable name: "t" "r" "b" "l" sides, "c-tl"… corners, "e" ellipse, "p0"… free points. */
  key: string;
  p: Pt;
  q: Pt;
  /** Sagitta: how far the arc's middle sits from the chord, + outwards. 0 = straight. */
  s: number;
  len: number;
}

export interface Outline {
  segs: Seg[];
  /** SVG path of the whole outline. */
  d: string;
}

export function newShape(): Shape {
  return { kind: "rect", corners: {}, arcs: {}, points: [], band: {}, note: "", image: "" };
}

/** Fills in anything missing from a saved shape. */
export function normalizeShape(raw: Partial<Shape>): Shape {
  return { ...newShape(), ...raw, corners: { ...raw.corners }, arcs: { ...raw.arcs }, band: { ...raw.band }, points: (raw.points || []).map(p => [p[0], p[1]] as Pt) };
}

const dist = (p: Pt, q: Pt) => Math.hypot(q[0] - p[0], q[1] - p[1]);
const same = (p: Pt, q: Pt) => dist(p, q) < 0.01;

interface Arc { r: number; large: 0 | 1; sweep: 0 | 1; len: number }

/** Circle through p, q and the point s away from the chord's middle. */
function arcOf(p: Pt, q: Pt, s: number): Arc | null {
  const c = dist(p, q);
  if (!s || !c) return null;
  const a = Math.abs(s);
  const r = (c * c / 4 + a * a) / (2 * a);
  let th = 2 * Math.asin(Math.min(1, c / (2 * r)));
  const large = a > c / 2 ? 1 : 0;
  if (large) th = 2 * Math.PI - th;
  // Outlines run clockwise on screen, so bulging outwards is SVG's clockwise sweep.
  return { r, large, sweep: s > 0 ? 1 : 0, len: r * th };
}

function seg(key: string, p: Pt, q: Pt, s = 0): Seg {
  const a = arcOf(p, q, s);
  return { key, p, q, s: a ? s : 0, len: a ? a.len : dist(p, q) };
}

const n = (v: number) => Math.round(v * 100) / 100;

/** SVG path step that draws seg from its start point. */
export function segStep(g: Seg): string {
  const a = arcOf(g.p, g.q, g.s);
  return a ? `A ${n(a.r)} ${n(a.r)} 0 ${a.large} ${a.sweep} ${n(g.q[0])} ${n(g.q[1])}` : `L ${n(g.q[0])} ${n(g.q[1])}`;
}

export const segPath = (g: Seg) => `M ${n(g.p[0])} ${n(g.p[1])} ${segStep(g)}`;

/** Middle of the edge, and the outward direction there (for labels). */
export function segMid(g: Seg): { at: Pt; out: Pt } {
  const dx = g.q[0] - g.p[0], dy = g.q[1] - g.p[1];
  const l = Math.hypot(dx, dy) || 1;
  const out: Pt = [dy / l, -dx / l];
  const m: Pt = [(g.p[0] + g.q[0]) / 2, (g.p[1] + g.q[1]) / 2];
  return { at: [m[0] + out[0] * g.s, m[1] + out[1] * g.s], out };
}

/** A corner mod is only used when neither side next to it bulges out (the corner is gone then). */
export const NEIGHBOURS: Record<Corner, [Side, Side]> = { tl: ["l", "t"], tr: ["t", "r"], br: ["r", "b"], bl: ["b", "l"] };

export function outline(sh: Shape, L: number, W: number): Outline {
  if (sh.kind === "ellipse") {
    const a = L / 2, b = W / 2;
    const h = ((a - b) / (a + b)) ** 2;
    const len = Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
    const g: Seg = { key: "e", p: [0, b], q: [0, b], s: 0, len };
    return { segs: [g], d: `M 0 ${n(b)} A ${n(a)} ${n(b)} 0 1 1 ${n(L)} ${n(b)} A ${n(a)} ${n(b)} 0 1 1 0 ${n(b)} Z` };
  }

  let segs: Seg[];
  if (sh.kind === "poly" && sh.points.length >= 3) {
    const pts = sh.points;
    segs = pts.map((p, i) => seg(`p${i}`, p, pts[(i + 1) % pts.length]));
  } else {
    const out = (s: Side) => Math.max(0, sh.arcs[s] || 0);
    const dT = out("t"), dR = out("r"), dB = out("b"), dL = out("l");
    const base: Record<Corner, Pt> = { tl: [dL, dT], tr: [L - dR, dT], br: [L - dR, W - dB], bl: [dL, W - dB] };
    // For each corner: where the side before it ends, where the side after it starts, and the corner edge.
    const ends = {} as Record<Corner, { in: Pt; out: Pt; s: number }>;
    for (const c of CORNERS) {
      const m = sh.corners[c];
      const [s1, s2] = NEIGHBOURS[c];
      if (!m || out(s1) || out(s2)) { ends[c] = { in: base[c], out: base[c], s: 0 }; continue; }
      const a = Math.min(m.kind === "cut" ? m.a : m.r, L);
      const b = Math.min(m.kind === "cut" ? m.b : m.r, W);
      const s = m.kind === "round" ? m.r * (1 - Math.SQRT1_2) : 0;
      ends[c] = {
        tl: { in: [0, b] as Pt, out: [a, 0] as Pt, s },
        tr: { in: [L - a, 0] as Pt, out: [L, b] as Pt, s },
        br: { in: [L, W - b] as Pt, out: [L - a, W] as Pt, s },
        bl: { in: [a, W] as Pt, out: [0, W - b] as Pt, s },
      }[c];
    }
    segs = [];
    const side = (key: Side, from: Corner, to: Corner) => segs.push(seg(key, ends[from].out, ends[to].in, sh.arcs[key] || 0));
    const corner = (c: Corner) => segs.push(seg(`c-${c}`, ends[c].in, ends[c].out, ends[c].s));
    corner("tl"); side("t", "tl", "tr");
    corner("tr"); side("r", "tr", "br");
    corner("br"); side("b", "br", "bl");
    corner("bl"); side("l", "bl", "tl");
    segs = segs.filter(g => !same(g.p, g.q));
  }
  if (!segs.length) return { segs, d: "" };
  const d = `M ${n(segs[0].p[0])} ${n(segs[0].p[1])} ` + segs.map(segStep).join(" ") + " Z";
  return { segs, d };
}

/** Metres of edge band on one piece. */
export function bandMetres(sh: Shape, L: number, W: number): number {
  return outline(sh, L, W).segs.reduce((a, g) => a + (sh.band[g.key] ? g.len : 0), 0) / 1000;
}

export const hasBand = (sh: Shape) => Object.values(sh.band).some(Boolean);

/** The current outline as free points, so a shape can be fine-tuned point by point. Arcs become short lines. */
export function toPoints(sh: Shape, L: number, W: number): Pt[] {
  if (sh.kind === "poly" && sh.points.length >= 3) return sh.points.map(p => [p[0], p[1]]);
  const pts: Pt[] = [];
  const r1 = (v: number) => Math.round(v * 10) / 10;
  if (sh.kind === "ellipse") {
    for (let i = 0; i < 24; i++) {
      const t = Math.PI + (i / 24) * 2 * Math.PI;
      pts.push([r1(L / 2 + (L / 2) * Math.cos(t)), r1(W / 2 + (W / 2) * Math.sin(t))]);
    }
    return pts;
  }
  for (const g of outline(sh, L, W).segs) {
    if (!g.s) { pts.push([r1(g.p[0]), r1(g.p[1])]); continue; }
    const steps = 6;
    const { out } = segMid(g);
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      // Point on the arc: chord point pushed out along a parabola, close enough at these sizes.
      const bulge = g.s * 4 * t * (1 - t);
      pts.push([r1(g.p[0] + (g.q[0] - g.p[0]) * t + out[0] * bulge), r1(g.p[1] + (g.q[1] - g.p[1]) * t + out[1] * bulge)]);
    }
  }
  return pts;
}

/** Shrinks an attached drawing so projects stay small. */
export async function readDrawing(f: File): Promise<string> {
  const url = URL.createObjectURL(f);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, 1400 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    const g = c.getContext("2d")!;
    g.fillStyle = "#fff";
    g.fillRect(0, 0, c.width, c.height);
    g.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}
