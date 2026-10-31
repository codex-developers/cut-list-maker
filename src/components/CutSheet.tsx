import type { ComponentChildren } from "preact";
import { bandName, hasEdge, matInfo, pieceBand, type ColKey, type Edge, type Project, type Settings } from "../model";
import { normalizeShape } from "../shape";
import { ShapeView } from "./ShapeView";
import { fmtDate, fmtNum, type Texts } from "../i18n";
import { stats, type Group, type Row } from "../sheet";

const MARK = ["", "—", "="];

function bandLabel(r: Row, s: Settings): string {
  const b = pieceBand(r, s, r.mat);
  return b ? bandName(b) : "";
}
export const GRAIN_MARK = { L: "↕", W: "↔", free: "" } as const;

function Dim({ v, e }: { v: number; e: Edge }) {
  return <>{fmtNum(v)}<span class="mk">{MARK[e]}</span></>;
}

interface Col {
  k: ColKey;
  label: keyof Texts;
  /** width in %; none = takes the rest */
  w?: number;
  cls: string;
  cell: (r: Row, s: Settings) => ComponentChildren;
}

// Sheet columns, in print order.
export const COLS: Col[] = [
  { k: "nr", label: "c_nr", w: 6, cls: "idx n", cell: r => r.nr },
  { k: "len", label: "c_len", w: 13, cls: "dim", cell: r => <Dim v={r.cutL} e={r.Le} /> },
  { k: "wid", label: "c_wid", w: 13, cls: "dim", cell: r => <Dim v={r.cutW} e={r.We} /> },
  { k: "qty", label: "c_qty", w: 10, cls: "qty", cell: r => r.qty },
  { k: "mat", label: "c_mat", cls: "mat", cell: r => r.mat },
  { k: "thick", label: "c_thick", w: 8, cls: "qty", cell: (r, s) => fmtNum(matInfo(r.mat, s).thickness) },
  { k: "band", label: "c_band", w: 12, cls: "band", cell: (r, s) => (hasEdge(r) ? bandLabel(r, s) : "") },
  { k: "grain", label: "c_grain", w: 10, cls: "grain", cell: r => GRAIN_MARK[r.g] },
  { k: "part", label: "c_part", w: 13, cls: "part", cell: r => r.name },
];

export function SheetHeader({ title, s, t }: { title: string; s: Settings; t: Texts }) {
  const c = s.company;
  return (
    <header class="s-head">
      <h1 class="s-title"><span>{t.s_kind}</span>{title || "—"}</h1>
      <div class="s-company">
        {c.logo && <img class="s-logo" src={c.logo} alt="" />}
        <div class="s-meta">
          {c.name.trim() && <b>{c.name.trim()}</b>}
          {c.phone.trim() && <span>{t.s_tel} {c.phone.trim()}</span>}
          {c.address.trim() && <span>{c.address.trim()}</span>}
          <span>{t.s_date}: {fmtDate()}</span>
        </div>
      </div>
    </header>
  );
}

export function CutSheet({ project, groups, settings: s, t }: { project: Project; groups: Group[]; settings: Settings; t: Texts }) {
  const cols = COLS.filter(c => s.cols[c.k]);
  const all = stats(groups.flatMap(g => g.rows));
  const sum = (x: { pcs: number; area: number; edge: number }) =>
    `${x.pcs} ${t.pcs} · ${fmtNum(x.area, 2)} m² · ${fmtNum(x.edge, 1)} ${t.edge_m}`;
  const usedBands = [...new Set(groups.flatMap(g => g.rows).filter(hasEdge).map(r => bandLabel(r, s)).filter(Boolean))];
  const hasGrain = groups.some(g => g.rows.some(r => r.g !== "free"));

  return (
    <div class="sheet">
      <SheetHeader title={project.name} s={s} t={t} />
      {project.note.trim() && <p class="s-note">{project.note.trim()}</p>}
      {s.deductBand && usedBands.length > 0 && <p class="s-note"><b>{t.s_deducted(usedBands.join(", "))}</b></p>}

      {!all.pcs ? (
        <p class="empty">{t.empty}</p>
      ) : (
        <>
          {groups.map(g => g.special ? <Special key="special" g={g} s={s} t={t} sum={sum} /> : (
            <section class="group" key={g.mat ?? "all"}>
              {g.mat !== null && (
                <div class="g-head">
                  <span class="g-name">{g.mat}</span>
                  <span class="g-sum">{sum(g.stats)}</span>
                </div>
              )}
              {/* Fixed column widths so columns line up from one material group to the next. */}
              <table style={{ tableLayout: "fixed" }}>
                <colgroup>{cols.map(c => <col key={c.k} style={c.w ? { width: `${c.w}%` } : undefined} />)}</colgroup>
                <thead><tr>{cols.map(c => <th key={c.k} class={c.cls}>{t[c.label] as string}</th>)}</tr></thead>
                <tbody>
                  {g.rows.map(r => <tr key={r.id}>{cols.map(c => <td key={c.k} class={c.cls}>{c.cell(r, s)}</td>)}</tr>)}
                </tbody>
              </table>
            </section>
          ))}
          <footer class="s-foot">
            <div class="legend">
              <span><b>{"—"}</b>{t.one}</span>
              <span><b>=</b>{t.two}</span>
              <span>{t.none}</span>
              {hasGrain && s.cols.grain && <span><b>{GRAIN_MARK.L}</b>{t.g_L}</span>}
              {hasGrain && s.cols.grain && <span><b>{GRAIN_MARK.W}</b>{t.g_W}</span>}
            </div>
            <div class="totals">{t.total}: {sum(all)}</div>
          </footer>
        </>
      )}
    </div>
  );
}

/** The custom-cut pieces: one card each with a dimensioned drawing, so the factory can't miss them. */
function Special({ g, s, t, sum }: { g: Group; s: Settings; t: Texts; sum: (x: Group["stats"]) => string }) {
  return (
    <section class="group special">
      <div class="g-head">
        <span class="g-name">{t.s_special}</span>
        <span class="g-sum">{sum(g.stats)}</span>
      </div>
      <p class="sp-hint">{t.s_special_hint}</p>
      <div class="sp-list">
        {g.rows.map(r => {
          const sh = normalizeShape(r.shape!);
          const band = hasEdge(r) ? bandLabel(r, s) || "✓" : "";
          return (
            <article class="sp-card" key={r.id}>
              <div class="sp-nr">{r.nr}</div>
              <div class="sp-name">{r.name}</div>
              <div class="sp-draw"><ShapeView shape={sh} L={r.L} W={r.W} grain={r.g} /></div>
              <dl class="sp-info">
                <dt>{t.s_rect}</dt><dd class="sp-dim">{fmtNum(r.cutL)} × {fmtNum(r.cutW)}</dd>
                <dt>{t.c_qty}</dt><dd class="sp-dim">{r.qty}</dd>
                <dt>{t.c_mat}</dt><dd>{r.mat} · {fmtNum(matInfo(r.mat, s).thickness)} mm</dd>
                {band && <><dt>{t.c_band}</dt><dd>{band}</dd></>}
                {r.g !== "free" && <><dt>{t.c_grain}</dt><dd>{r.g === "L" ? t.g_L : t.g_W}</dd></>}
                {sh.note.trim() && <><dt>{t.sh_note}</dt><dd class="sp-note">{sh.note.trim()}</dd></>}
              </dl>
              {sh.image && <img class="sp-image" src={sh.image} alt="" />}
            </article>
          );
        })}
      </div>
    </section>
  );
}
