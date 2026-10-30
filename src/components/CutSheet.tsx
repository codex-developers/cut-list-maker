import type { ComponentChildren } from "preact";
import type { ColKey, Edge, Project, Settings } from "../model";
import { fmtDate, fmtNum, type Texts } from "../i18n";
import { buildGroups, stats, type Row } from "../sheet";

const MARK = ["", "—", "="];

function Dim({ v, e }: { v: number; e: Edge }) {
  return <>{fmtNum(v)}<span class="mk">{MARK[e]}</span></>;
}

interface Col {
  k: ColKey;
  label: keyof Texts;
  /** width in %; none = takes the rest */
  w?: number;
  cls: string;
  cell: (r: Row, i: number, s: Settings) => ComponentChildren;
}

// Sheet columns, in print order.
export const COLS: Col[] = [
  { k: "nr", label: "c_nr", w: 6, cls: "idx n", cell: (_r, i) => i },
  { k: "len", label: "c_len", w: 13, cls: "dim", cell: r => <Dim v={r.L} e={r.Le} /> },
  { k: "wid", label: "c_wid", w: 13, cls: "dim", cell: r => <Dim v={r.W} e={r.We} /> },
  { k: "qty", label: "c_qty", w: 9, cls: "qty", cell: r => r.qty },
  { k: "mat", label: "c_mat", cls: "mat", cell: r => r.mat },
  { k: "band", label: "c_band", w: 14, cls: "band", cell: (r, _i, s) => (r.Le || r.We ? (s.bandMap[r.mat] || "").trim() : "") },
  { k: "part", label: "c_part", w: 15, cls: "part", cell: r => r.name },
];

export function CutSheet({ project, settings: s, t }: { project: Project; settings: Settings; t: Texts }) {
  const groups = buildGroups(project.pieces, s);
  const cols = COLS.filter(c => s.cols[c.k]);
  const all = stats(project.pieces);
  const sum = (x: { pcs: number; area: number; edge: number }) =>
    `${x.pcs} ${t.pcs} · ${fmtNum(x.area, 2)} m² · ${fmtNum(x.edge, 1)} ${t.edge_m}`;
  let i = 0;

  return (
    <div class="sheet">
      <header class="s-head">
        <h1 class="s-title"><span>{t.s_kind}</span>{project.name || "—"}</h1>
        <div class="s-meta">
          <b>{t.s_date}:</b> {fmtDate()}
          {s.from.trim() && <><br /><b>{t.s_from}:</b> {s.from.trim()}</>}
        </div>
      </header>
      {project.note.trim() && <p class="s-note">{project.note.trim()}</p>}

      {!project.pieces.length ? (
        <p class="empty">{t.empty}</p>
      ) : (
        <>
          {groups.map(g => (
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
                  {g.rows.map(r => {
                    i++;
                    return <tr key={r.id}>{cols.map(c => <td key={c.k} class={c.cls}>{c.cell(r, i, s)}</td>)}</tr>;
                  })}
                </tbody>
              </table>
            </section>
          ))}
          <footer class="s-foot">
            <div class="legend">
              <span><b>{"—"}</b>{t.one}</span>
              <span><b>=</b>{t.two}</span>
              <span>{t.none}</span>
            </div>
            <div class="totals">{t.total}: {sum(all)}</div>
          </footer>
        </>
      )}
    </div>
  );
}
