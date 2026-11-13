import { useEffect } from "preact/hooks";
import type { Piece, Settings } from "../model";
import { effectiveGrain, materialOf, matInfo } from "../model";
import { fmtNum, type Texts } from "../i18n";
import {
  autoCount, HINGE_SIDES, hingeCount, hingeEdgeLen, hingePositions, hingeProblem, newHinges, type Hinges,
} from "../hinge";
import { NumInput } from "./NumInput";
import { HingeView } from "./HingeView";

interface Props {
  piece: Piece;
  settings: Settings;
  t: Texts;
  /** undefined removes the drilling. */
  onHinges: (h: Hinges | undefined, coalesce?: boolean) => void;
  onClose: () => void;
}

/** Dialog for a piece's 35 mm hinge cups: which edge, how many and where. */
export function HingeDialog({ piece: p, settings: s, t, onHinges, onClose }: Props) {
  const d = s.hinge;
  // A piece wider than tall is most likely a flap, hinged on its top edge.
  const h = p.hinges ?? newHinges(d, p.W > p.L ? "t" : "l");
  const L = p.L || 720, W = p.W || 400;
  const set = (patch: Partial<Hinges>, coalesce = false) => onHinges({ ...h, ...patch }, coalesce);

  // Opening the dialog on an undrilled piece drills it with the defaults, so what is shown is what prints.
  useEffect(() => { if (!p.hinges) onHinges(h); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const len = hingeEdgeLen(h, L, W);
  const pos = hingePositions(h, L, W);
  const manual = !!h.custom?.length;
  const bad = hingeProblem(h, L, W, d.dia);
  const grain = effectiveGrain(p, matInfo(materialOf(p, s), s));

  return (
    <div class="modal" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div class="dialog" role="dialog" aria-modal="true" aria-label={t.hg_title}>
        <header class="dlg-head">
          <div>
            <h2>{t.hg_title}</h2>
            <p class="hint">{p.name || "—"} · {fmtNum(L)} × {fmtNum(W)} · {p.qty}×</p>
          </div>
          <button type="button" class="icon" aria-label={t.sh_done} onClick={onClose}>✕</button>
        </header>
        <p class="hint">{t.hg_intro(fmtNum(d.dia), fmtNum(d.depth))}</p>

        <div class="dlg-body">
          <div class="dlg-draw">
            <div class="shape-paper hinge-paper"><HingeView h={h} L={L} W={W} dia={d.dia} grain={grain} bad={bad} /></div>
            {bad && <p class="hint warn-text">{t.hg_bad}</p>}
          </div>

          <div class="dlg-form">
            <b class="sub">{t.hg_side}</b>
            <div class="seg-btns" role="tablist">
              {HINGE_SIDES.map(k => (
                <button key={k} type="button" role="tab" aria-selected={h.side === k} class={"seg-btn" + (h.side === k ? " on" : "")}
                  onClick={() => set({ side: k, custom: undefined })}>
                  {t.sh_side[k]}
                </button>
              ))}
            </div>
            <p class="hint" style={{ margin: 0 }}>{t.hg_side_hint}</p>

            <div class="sh-grid">
              <div class="sh-line">
                <span class="sh-label">{t.hg_count}</span>
                <select id="hg-count" value={manual ? "m" : String(h.count)} onChange={e => {
                  const v = e.currentTarget.value;
                  if (v === "m") set({ custom: pos });
                  else set({ count: Number(v), custom: undefined });
                }}>
                  <option value="0">{t.hg_auto(autoCount(len))}</option>
                  {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={String(n)}>{n}</option>)}
                  <option value="m">{t.hg_manual}</option>
                </select>
              </div>
              {!manual && (
                <div class="sh-line">
                  <span class="sh-label">{t.hg_end}</span>
                  <NumInput id="hg-end" value={h.end} onValue={v => set({ end: v }, true)} class="narrow" /> mm
                </div>
              )}
              <div class="sh-line">
                <span class="sh-label">{t.hg_edge}</span>
                <NumInput id="hg-edge" value={h.edge} onValue={v => set({ edge: v }, true)} class="narrow" /> mm
              </div>
            </div>

            <b class="sub">{t.hg_pos(h.side === "l" || h.side === "r" ? t.hg_from_top : t.hg_from_left)}</b>
            {manual ? (
              <>
                <div class="sh-points">
                  {h.custom!.map((v, i) => (
                    <div key={i} class="sh-line">
                      <span class="sh-label idx">{i + 1}</span>
                      <NumInput id={`hg-p${i}`} value={v} onValue={x => set({ custom: h.custom!.map((q, k) => (k === i ? x : q)) }, true)} /> mm
                      <button type="button" class="icon" aria-label={t.remove} title={t.remove} disabled={h.custom!.length <= 1}
                        onClick={() => set({ custom: h.custom!.filter((_, k) => k !== i) })}>✕</button>
                    </div>
                  ))}
                </div>
                <div class="row">
                  <button class="btn" type="button" onClick={() => {
                    const c = [...h.custom!].sort((a, b) => a - b);
                    // The new cup goes into the widest gap.
                    let at = len / 2, gap = 0;
                    for (let i = 1; i < c.length; i++) if (c[i] - c[i - 1] > gap) { gap = c[i] - c[i - 1]; at = (c[i] + c[i - 1]) / 2; }
                    set({ custom: [...c, Math.round(at)].sort((a, b) => a - b) });
                  }}>+ {t.hg_add}</button>
                  <button class="btn ghost" type="button" onClick={() => set({ custom: undefined, count: 0 })}>{t.hg_reset}</button>
                </div>
              </>
            ) : (
              <p class="hinge-list">{pos.map(v => fmtNum(v)).join(" · ")} mm</p>
            )}
            <p class="hint">{t.hg_n(hingeCount(h, L, W), p.qty)}</p>
          </div>
        </div>

        <footer class="dlg-foot">
          <button class="btn ghost" type="button" onClick={() => { onHinges(undefined); onClose(); }}>{t.hg_remove}</button>
          <button class="btn primary" type="button" onClick={onClose}>{t.sh_done}</button>
        </footer>
      </div>
    </div>
  );
}
