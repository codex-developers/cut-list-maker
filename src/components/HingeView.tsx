import { fmtNum } from "../i18n";
import { hingeHoles, hingePositions, type Hinges } from "../hinge";

interface Props {
  h: Hinges;
  /** Piece length (drawn top to bottom) and width (left to right). */
  L: number;
  W: number;
  dia: number;
  /** Wood grain lines: "L" along the length, "W" along the width. */
  grain?: "L" | "W" | "free";
  /** Marks a cup that falls outside the piece or overlaps the next one. */
  bad?: boolean;
}

/** A hinged piece standing up, seen from the face where the cups are drilled, with each cup's distance from the end. */
export function HingeView({ h, L, W, dia, grain = "free", bad }: Props) {
  const M = Math.max(L, W, 1);
  const fs = M * 0.05;
  const pad = fs * 3.4;
  const sw = M / 300;
  const holes = hingeHoles(h, L, W);
  const pos = hingePositions(h, L, W);
  const r = (v: number) => fmtNum(Math.round(v * 10) / 10);
  const vertical = h.side === "l" || h.side === "r";
  const gap = M / 40;
  const pid = `hv-grain-${grain}-${Math.round(gap * 10)}`;
  // Each cup's distance runs from the near end of the edge; the outline size goes on the opposite side.
  const tick = fs * 0.5;
  const out = fs * 1.1;
  return (
    <svg class="shape-svg hinge-svg" viewBox={`${-pad} ${-pad} ${W + 2 * pad} ${L + 2 * pad}`} role="img">
      {grain !== "free" && (
        <defs>
          <pattern id={pid} width={gap} height={gap} patternUnits="userSpaceOnUse">
            <rect width={gap} height={gap} fill="#fff" />
            {grain === "L" ? <line x1={gap / 2} y1={0} x2={gap / 2} y2={gap} stroke="#d2cdc3" stroke-width={sw} />
              : <line x1={0} y1={gap / 2} x2={gap} y2={gap / 2} stroke="#d2cdc3" stroke-width={sw} />}
          </pattern>
        </defs>
      )}
      <rect x={0} y={0} width={W} height={L} fill={grain !== "free" ? `url(#${pid})` : "#fff"} stroke="#111" stroke-width={sw * 2.2} />

      {holes.map(([x, y], i) => (
        <g key={i}>
          {/* Extension line from the cup centre out past the hinge edge. */}
          {vertical
            ? <line x1={x} y1={y} x2={h.side === "l" ? -out : W + out} y2={y} stroke="#888" stroke-width={sw} stroke-dasharray={`${sw * 4} ${sw * 3}`} />
            : <line x1={x} y1={y} x2={x} y2={h.side === "t" ? -out : L + out} stroke="#888" stroke-width={sw} stroke-dasharray={`${sw * 4} ${sw * 3}`} />}
          <circle cx={x} cy={y} r={dia / 2} fill="#fff" stroke={bad ? "#b42318" : "#111"} stroke-width={sw * 2} />
          <line x1={x - tick} y1={y} x2={x + tick} y2={y} stroke="#111" stroke-width={sw} />
          <line x1={x} y1={y - tick} x2={x} y2={y + tick} stroke="#111" stroke-width={sw} />
        </g>
      ))}

      <g class="shape-dim" font-size={fs}>
        {vertical ? (
          <>
            <text x={W / 2} y={-fs * 0.9} text-anchor="middle">{r(W)}</text>
            {h.side === "l"
              ? <text x={W + fs * 0.9} y={L / 2} text-anchor="middle" transform={`rotate(90 ${W + fs * 0.9} ${L / 2})`}>{r(L)}</text>
              : <text x={-fs * 0.9} y={L / 2} text-anchor="middle" transform={`rotate(-90 ${-fs * 0.9} ${L / 2})`}>{r(L)}</text>}
            {pos.map((p, i) => (
              <text key={i} class="hinge-pos" x={h.side === "l" ? -out - fs * 0.25 : W + out + fs * 0.25} y={p}
                text-anchor={h.side === "l" ? "end" : "start"} dominant-baseline="central">{r(p)}</text>
            ))}
            <text class="hinge-edge" x={h.side === "l" ? h.edge + dia / 2 + fs * 0.3 : W - h.edge - dia / 2 - fs * 0.3} y={pos[0]}
              text-anchor={h.side === "l" ? "start" : "end"} dominant-baseline="central" font-size={fs * 0.75}>{r(h.edge)}</text>
          </>
        ) : (
          <>
            {h.side === "t"
              ? <text x={W / 2} y={L + fs * 1.5} text-anchor="middle">{r(W)}</text>
              : <text x={W / 2} y={-fs * 0.9} text-anchor="middle">{r(W)}</text>}
            <text x={-fs * 0.9} y={L / 2} text-anchor="middle" transform={`rotate(-90 ${-fs * 0.9} ${L / 2})`}>{r(L)}</text>
            {pos.map((p, i) => {
              const y = h.side === "t" ? -out - fs * 0.35 : L + out + fs * 0.35;
              return (
                <text key={i} class="hinge-pos" x={p} y={y} text-anchor="middle" dominant-baseline="central"
                  transform={`rotate(-90 ${p} ${y})`}>{r(p)}</text>
              );
            })}
            <text class="hinge-edge" x={pos[0] + dia / 2 + fs * 0.3} y={h.side === "t" ? h.edge / 2 : L - h.edge / 2} dominant-baseline="central" font-size={fs * 0.75}>{r(h.edge)}</text>
          </>
        )}
      </g>
    </svg>
  );
}
