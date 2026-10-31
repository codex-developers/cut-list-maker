import { fmtNum } from "../i18n";
import { outline, segMid, segPath, type Shape } from "../shape";

interface Props {
  shape: Shape;
  L: number;
  W: number;
  /** Click an edge to toggle its band. */
  onEdge?: (key: string) => void;
  /** Size labels on every edge (off for small thumbnails). */
  labels?: boolean;
  /** Wood grain lines inside the shape: "L" along the length, "W" along the width. */
  grain?: "L" | "W" | "free";
  class?: string;
}

/** A piece's custom cut, length across, with banded edges drawn thick. */
export function ShapeView({ shape, L, W, onEdge, labels = true, grain = "free", class: cls = "" }: Props) {
  const o = outline(shape, L, W);
  const M = Math.max(L, W) || 1;
  const pad = labels ? M * 0.13 : M * 0.04;
  const fs = M * 0.042;
  const sw = M / 260;
  const r = (v: number) => fmtNum(Math.round(v * 10) / 10);
  // Points typed counter-clockwise would put the labels inside; flip them out again.
  const area = o.segs.reduce((a, g) => a + g.p[0] * g.q[1] - g.q[0] * g.p[1], 0);
  const flip = area < 0 ? -1 : 1;
  /** Edges lying on the rectangle's top or left side already have the overall size label. */
  const onFrame = (g: (typeof o.segs)[number]) =>
    !g.s && ((Math.abs(g.p[1]) < 0.5 && Math.abs(g.q[1]) < 0.5 && Math.abs(g.len - L) < 0.5) ||
             (Math.abs(g.p[0]) < 0.5 && Math.abs(g.q[0]) < 0.5 && Math.abs(g.len - W) < 0.5));
  const gap = M / 40;
  // Pattern ids are page-wide, so the id carries the line spacing.
  const pid = `sk-grain-${grain}-${Math.round(gap * 10)}`;
  return (
    <svg class={"shape-svg " + cls} viewBox={`${-pad} ${-pad} ${L + 2 * pad} ${W + 2 * pad}`} role="img">
      <rect x={0} y={0} width={L} height={W} fill="none" stroke="#b9b9b9" stroke-width={sw} stroke-dasharray={`${sw * 6} ${sw * 4}`} />
      {grain !== "free" && (
        <defs>
          <pattern id={pid} width={gap} height={gap} patternUnits="userSpaceOnUse">
            <rect width={gap} height={gap} fill="#fff" />
            {grain === "L" ? <line x1={0} y1={gap / 2} x2={gap} y2={gap / 2} stroke="#c4bfb5" stroke-width={sw} />
              : <line x1={gap / 2} y1={0} x2={gap / 2} y2={gap} stroke="#c4bfb5" stroke-width={sw} />}
          </pattern>
        </defs>
      )}
      {o.d && <path d={o.d} fill={grain !== "free" ? `url(#${pid})` : onEdge ? "#f2f7f6" : "#fff"} stroke="none" />}
      {o.segs.map(g => {
        const d = shape.kind === "ellipse" ? o.d : segPath(g);
        const on = !!shape.band[g.key];
        return (
          <g key={g.key}>
            <path d={d} fill="none" stroke={on ? "#111" : "#8a8a8a"} stroke-width={on ? sw * 4.5 : sw * 1.4} stroke-linejoin="round" />
            {onEdge && (
              <path d={d} fill="none" stroke="transparent" stroke-width={sw * 18} class="shape-hit" onClick={() => onEdge(g.key)}>
                <title>{r(g.len)} mm</title>
              </path>
            )}
          </g>
        );
      })}
      {labels && (
        <g class="shape-dim" font-size={fs}>
          <text x={L / 2} y={-pad * 0.5} text-anchor="middle">{r(L)}</text>
          <text x={-pad * 0.5} y={W / 2} text-anchor="middle" transform={`rotate(-90 ${-pad * 0.5} ${W / 2})`}>{r(W)}</text>
          {shape.kind !== "ellipse" && o.segs.filter(g => g.len >= 5 && !onFrame(g)).map(g => {
            const { at, out } = segMid(g);
            const x = at[0] + out[0] * flip * fs * 1.1, y = at[1] + out[1] * flip * fs * 1.1;
            return <text key={g.key} x={x} y={y} text-anchor="middle" dominant-baseline="central" class="shape-len">{r(g.len)}</text>;
          })}
        </g>
      )}
    </svg>
  );
}
