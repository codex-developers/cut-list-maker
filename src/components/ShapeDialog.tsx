import { useEffect } from "preact/hooks";
import type { Piece } from "../model";
import { fmtNum, type Texts } from "../i18n";
import { pickFile } from "../hooks";
import {
  bandMetres, CORNERS, NEIGHBOURS, newShape, normalizeShape, outline, readDrawing, SIDES, toPoints,
  type Corner, type CornerMod, type Pt, type Shape, type ShapeKind, type Side,
} from "../shape";
import { NumInput } from "./NumInput";
import { ShapeView } from "./ShapeView";

interface Props {
  piece: Piece;
  t: Texts;
  /** undefined removes the shape. */
  onShape: (shape: Shape | undefined, coalesce?: boolean) => void;
  onClose: () => void;
}

/** Dialog for a piece's custom cut: shape, edge band per edge, note and an attached drawing. */
export function ShapeDialog({ piece: p, t, onShape, onClose }: Props) {
  const sh = normalizeShape(p.shape ?? newShape());
  const L = p.L || 600, W = p.W || 400;
  const set = (patch: Partial<Shape>, coalesce = false) => onShape({ ...sh, ...patch }, coalesce);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const segs = outline(sh, L, W).segs;
  const toggle = (key: string) => set({ band: { ...sh.band, [key]: !sh.band[key] } });
  const bandAll = (on: boolean) => set({ band: Object.fromEntries(segs.map(g => [g.key, on])) });

  const setKind = (kind: ShapeKind) => {
    // Switching to points starts from the outline as it is now, so a shape can be fine-tuned.
    const points = kind === "poly" && sh.points.length < 3 ? toPoints(sh, L, W) : sh.points;
    set({ kind, points, band: {} });
  };

  const corner = (c: Corner, m: CornerMod | undefined) => set({ corners: { ...sh.corners, [c]: m } }, true);
  const arc = (s: Side, v: number | undefined) => set({ arcs: { ...sh.arcs, [s]: v } }, true);
  const point = (i: number, xy: Pt) => set({ points: sh.points.map((q, k) => (k === i ? xy : q)) }, true);

  const takeImage = async (f: File | null | undefined) => {
    if (f && f.type.startsWith("image/")) set({ image: await readDrawing(f) });
  };

  return (
    <div class="modal" onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      onPaste={e => { const f = [...(e.clipboardData?.files ?? [])].find(x => x.type.startsWith("image/")); if (f) { e.preventDefault(); takeImage(f); } }}
      onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={e => { e.preventDefault(); e.stopPropagation(); takeImage(e.dataTransfer?.files[0]); }}>
      <div class="dialog" role="dialog" aria-modal="true" aria-label={t.sh_title}>
        <header class="dlg-head">
          <div>
            <h2>{t.sh_title}</h2>
            <p class="hint">{p.name || "—"} · {fmtNum(L)} × {fmtNum(W)} · {p.qty}×</p>
          </div>
          <button type="button" class="icon" aria-label={t.sh_done} onClick={onClose}>✕</button>
        </header>
        <p class="hint">{t.sh_intro}</p>

        <div class="dlg-body">
          <div class="dlg-draw">
            <div class="shape-paper"><ShapeView shape={sh} L={L} W={W} onEdge={toggle} /></div>
            <div class="box-lite">
              <b>{t.sh_band}</b>
              <p class="hint">{t.sh_band_hint}</p>
              <div class="row">
                <button class="btn" type="button" onClick={() => bandAll(true)}>{t.sh_band_all}</button>
                <button class="btn ghost" type="button" onClick={() => bandAll(false)}>{t.sh_band_none}</button>
                <span class="hint" style={{ margin: 0 }}>{t.sh_band_m(fmtNum(bandMetres(sh, L, W), 2))}</span>
              </div>
            </div>
          </div>

          <div class="dlg-form">
            <div class="seg-btns" role="tablist">
              {(["rect", "ellipse", "poly"] as ShapeKind[]).map(k => (
                <button key={k} type="button" role="tab" aria-selected={sh.kind === k} class={"seg-btn" + (sh.kind === k ? " on" : "")} onClick={() => setKind(k)}>
                  {k === "rect" ? t.sh_rect : k === "ellipse" ? t.sh_ellipse : t.sh_poly}
                </button>
              ))}
            </div>

            {sh.kind === "rect" && (
              <>
                <b class="sub">{t.sh_corners}</b>
                <div class="sh-grid">
                  {CORNERS.map(c => {
                    const m = sh.corners[c];
                    const blocked = NEIGHBOURS[c].some(s => (sh.arcs[s] || 0) > 0);
                    return (
                      <div key={c} class="sh-line">
                        <span class="sh-label">{t.sh_corner[c]}</span>
                        <select id={`shc-${c}`} value={m?.kind ?? ""} disabled={blocked}
                          onChange={e => {
                            const k = e.currentTarget.value;
                            const d = Math.round(Math.min(L, W) / 4);
                            corner(c, k === "cut" ? { kind: "cut", a: d, b: d } : k === "round" ? { kind: "round", r: d } : undefined);
                          }}>
                          <option value="">{t.sh_none}</option>
                          <option value="cut">{t.sh_cut}</option>
                          <option value="round">{t.sh_round}</option>
                        </select>
                        {m?.kind === "cut" && !blocked && (
                          <span class="sh-nums">
                            <label>{t.sh_a} <NumInput id={`sha-${c}`} value={m.a} onValue={v => corner(c, { ...m, a: v })} class="narrow" /></label>
                            <label>{t.sh_b} <NumInput id={`shb-${c}`} value={m.b} onValue={v => corner(c, { ...m, b: v })} class="narrow" /></label>
                          </span>
                        )}
                        {m?.kind === "round" && !blocked && (
                          <span class="sh-nums">
                            <label>{t.sh_r} <NumInput id={`shr-${c}`} value={m.r} onValue={v => corner(c, { kind: "round", r: v })} class="narrow" /></label>
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <b class="sub">{t.sh_sides}</b>
                <div class="sh-grid">
                  {SIDES.map(s => {
                    const v = sh.arcs[s] || 0;
                    const dir = v > 0 ? "out" : v < 0 ? "in" : "";
                    const along = s === "t" || s === "b" ? L : W;
                    return (
                      <div key={s} class="sh-line">
                        <span class="sh-label">{t.sh_side[s]}</span>
                        <select id={`shs-${s}`} value={dir}
                          onChange={e => {
                            const k = e.currentTarget.value;
                            const d = Math.abs(v) || Math.round(along / 8);
                            arc(s, k === "out" ? d : k === "in" ? -d : undefined);
                          }}>
                          <option value="">{t.sh_straight}</option>
                          <option value="out">{t.sh_out}</option>
                          <option value="in">{t.sh_in}</option>
                        </select>
                        {dir && (
                          <span class="sh-nums">
                            <label>{t.sh_depth} <NumInput id={`shd-${s}`} value={Math.abs(v)} onValue={x => arc(s, dir === "out" ? x : -x)} class="narrow" /></label>
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p class="hint">{t.sh_arc_hint}</p>
              </>
            )}

            {sh.kind === "ellipse" && <p class="hint">{t.sh_ellipse_hint}</p>}

            {sh.kind === "poly" && (
              <>
                <b class="sub">{t.sh_points}</b>
                <div class="sh-points">
                  {sh.points.map((q, i) => (
                    <div key={i} class="sh-line">
                      <span class="sh-label idx">{i + 1}</span>
                      <label>x <NumInput id={`shx-${i}`} value={q[0]} zero onValue={v => point(i, [v, q[1]])} /></label>
                      <label>y <NumInput id={`shy-${i}`} value={q[1]} zero onValue={v => point(i, [q[0], v])} /></label>
                      <button type="button" class="icon" aria-label={t.remove} title={t.remove} disabled={sh.points.length <= 3}
                        onClick={() => set({ points: sh.points.filter((_, k) => k !== i), band: {} })}>✕</button>
                    </div>
                  ))}
                </div>
                <div class="row">
                  <button class="btn" type="button" onClick={() => {
                    const a = sh.points[sh.points.length - 1] ?? [0, 0], b = sh.points[0] ?? [0, 0];
                    set({ points: [...sh.points, [Math.round((a[0] + b[0]) / 2), Math.round((a[1] + b[1]) / 2)]] });
                  }}>+ {t.sh_add_point}</button>
                  <button class="btn ghost" type="button" onClick={() => set({ points: toPoints({ ...sh, kind: "rect" }, L, W), band: {} })}>{t.sh_from_shape}</button>
                </div>
              </>
            )}

            <label class="field"><span>{t.sh_note}</span>
              <textarea id="sh-note" class="plain" value={sh.note} onInput={e => set({ note: e.currentTarget.value }, true)} />
            </label>

            <div class="field">
              <span>{t.sh_image}</span>
              <p class="hint" style={{ margin: 0 }}>{t.sh_image_hint}</p>
              {sh.image && <img class="sh-image" src={sh.image} alt="" />}
              <div class="row">
                <button class="btn" type="button" onClick={async () => takeImage(await pickFile("image/*"))}>{t.sh_image_add}</button>
                {sh.image && <button class="btn ghost" type="button" onClick={() => set({ image: "" })}>{t.sh_image_remove}</button>}
              </div>
            </div>
          </div>
        </div>

        <footer class="dlg-foot">
          <button class="btn ghost" type="button" onClick={() => { onShape(undefined); onClose(); }}>{t.sh_remove}</button>
          <button class="btn primary" type="button" onClick={onClose}>{t.sh_done}</button>
        </footer>
      </div>
    </div>
  );
}
