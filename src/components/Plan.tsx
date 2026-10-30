import type { Settings } from "../model";
import { fmtNum, type Texts } from "../i18n";
import type { Board, MaterialPlan } from "../optimizer";

/** All cutting diagrams for a project, one block per material. */
export function Plan({ plans, s, t }: { plans: MaterialPlan[]; s: Settings; t: Texts }) {
  if (!plans.length) return <p class="empty">{t.plan_empty}</p>;
  return (
    <div class="plan">
      <p class="plan-intro">
        {t.plan_intro(s.kerf, s.trim)} <a class="screen-link" href="#/settings">{t.plan_change}</a>
      </p>
      <p class="plan-intro">{t.plan_legend}</p>
      {plans.map(mp => <MaterialBlock key={mp.mat} mp={mp} s={s} t={t} />)}
    </div>
  );
}

function MaterialBlock({ mp, s, t }: { mp: MaterialPlan; s: Settings; t: Texts }) {
  return (
    <section class="plan-mat">
      <div class="g-head">
        <span class="g-name">{mp.mat}</span>
        <span class="g-sum">
          {t.boards(mp.boards.length)} · {fmtNum(mp.sheetL)} × {fmtNum(mp.sheetW)} · {t.used} {fmtNum(mp.used * 100, 1)}% · {t.waste} {fmtNum((1 - mp.used) * 100, 1)}%
        </span>
      </div>

      {mp.notFit.length > 0 && (
        <div class="plan-warn">
          <b>{t.not_fit}:</b>{" "}
          {mp.notFit.map(n => `#${n.nr} ${n.name} ${fmtNum(n.L)} × ${fmtNum(n.W)} (${n.qty}×)`).join(", ")}
        </div>
      )}

      <div class="boards">
        {mp.boards.map((b, i) => (
          <figure class="board" key={i}>
            <figcaption>
              <b>{t.board_n(i + 1, mp.boards.length)}</b>
              <span>{b.placed.length} {t.pcs}</span>
            </figcaption>
            <BoardSvg b={b} mp={mp} trim={s.trim} t={t} />
          </figure>
        ))}
      </div>

      {mp.boards.length > 0 && (
        <div class="offcuts">
          <b>{t.offcuts}:</b>{" "}
          {mp.offcuts.length
            ? mp.offcuts.map(o => `${fmtNum(Math.round(o.rect.w))} × ${fmtNum(Math.round(o.rect.h))} (${o.board + 1})`).join(" · ")
            : t.no_offcuts}
        </div>
      )}
    </section>
  );
}

function BoardSvg({ b, mp, trim, t }: { b: Board; mp: MaterialPlan; trim: number; t: Texts }) {
  const W = mp.sheetL, H = mp.sheetW;
  const pad = 60; // room for the grain arrow under the board
  const isOffcut = (w: number, h: number) => mp.offcuts.some(o => o.rect.w === w && o.rect.h === h);
  return (
    <svg viewBox={`-10 -10 ${W + 20} ${H + pad + 20}`} role="img" aria-label={`${mp.mat} ${W} × ${H}`}>
      <defs>
        <pattern id="waste" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="40" height="40" fill="#f1efea" />
          <line x1="0" y1="0" x2="0" y2="40" stroke="#c9c4ba" stroke-width="10" />
        </pattern>
        {/* Wood grain: fine lines along the board length. */}
        <pattern id="grain" width="400" height="48" patternUnits="userSpaceOnUse">
          <rect width="400" height="48" fill="#fff" />
          <path d="M 0 14 C 100 6, 300 22, 400 14 M 0 36 C 120 42, 260 28, 400 36" fill="none" stroke="#b8b1a3" stroke-width="2" />
        </pattern>
      </defs>
      <rect x="0" y="0" width={W} height={H} fill="url(#waste)" stroke="#111" stroke-width="6" />
      <g transform={`translate(${trim} ${trim})`}>
        {b.free.filter(r => isOffcut(r.w, r.h)).map((r, i) => (
          <g key={"f" + i}>
            <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="#e3efe9" stroke="#7aa894" stroke-width="3" stroke-dasharray="18 12" />
            <text x={r.x + r.w / 2} y={r.y + r.h / 2} class="svg-off" font-size={label(r.w, r.h) * 0.6}>
              {fmtNum(Math.round(r.w))} × {fmtNum(Math.round(r.h))}
            </text>
          </g>
        ))}
        {b.placed.map((p, i) => {
          const fs = label(p.w, p.h);
          const showDims = Math.min(p.w, p.h) > fs * 2.6 && p.w > fs * 5;
          return (
            <g key={i}>
              <rect x={p.x} y={p.y} width={p.w} height={p.h} fill={mp.grain ? "url(#grain)" : "#fff"} stroke="#111" stroke-width="4" />
              <text x={p.x + p.w / 2} y={p.y + p.h / 2 - (showDims ? fs * 0.45 : 0)} class="svg-nr" font-size={fs}>{p.nr}</text>
              {showDims && (
                <text x={p.x + p.w / 2} y={p.y + p.h / 2 + fs * 0.75} class="svg-dim" font-size={fs * 0.62}>
                  {fmtNum(p.turned ? p.W : p.L)} × {fmtNum(p.turned ? p.L : p.W)}
                </text>
              )}
            </g>
          );
        })}
      </g>
      {mp.grain && (
        <g class="svg-grain">
          <line x1={W / 2 - 260} y1={H + 40} x2={W / 2 + 200} y2={H + 40} stroke="#555" stroke-width="5" marker-end="" />
          <path d={`M ${W / 2 + 200} ${H + 22} L ${W / 2 + 250} ${H + 40} L ${W / 2 + 200} ${H + 58} Z`} fill="#555" />
          <text x={W / 2 - 290} y={H + 40} class="svg-cap" font-size="44" text-anchor="end">{t.plan_grain}</text>
        </g>
      )}
    </svg>
  );
}

/** Label size in board millimetres, scaled to the piece. */
const label = (w: number, h: number) => Math.max(34, Math.min(110, Math.min(w, h) * 0.32));
