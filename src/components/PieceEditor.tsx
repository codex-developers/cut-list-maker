import { useEffect, useRef, useState } from "preact/hooks";
import { effectiveGrain, fitsBoard, materialOf, matInfo, newPiece, type Edge, type Grain, type Piece, type Settings } from "../model";
import type { Texts } from "../i18n";
import { GRAIN_MARK } from "./CutSheet";
import { NumInput } from "./NumInput";

interface Props {
  pieces: Piece[];
  settings: Settings;
  t: Texts;
  onChange: (pieces: Piece[], coalesce?: boolean) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

/** Click order of the grain toggle; undefined = follow the material. */
const GRAIN_CYCLE: (Grain | undefined)[] = [undefined, "L", "W", "free"];

export function PieceEditor({ pieces, settings: s, t, onChange, canUndo, canRedo, onUndo, onRedo }: Props) {
  const [focusId, setFocusId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const tableRef = useRef<HTMLTableElement>(null);

  useEffect(() => {
    if (!focusId) return;
    tableRef.current?.querySelector<HTMLInputElement>(`[data-row="${focusId}"] input`)?.focus();
    setFocusId(null);
  }, [focusId]);

  const update = (id: string, patch: Partial<Piece>, coalesce = true) =>
    onChange(pieces.map(p => (p.id === id ? { ...p, ...patch } : p)), coalesce);

  const add = (after?: Piece) => {
    // A new row copies material and grain from the row above, which is usually the same board.
    const src = after ?? pieces[pieces.length - 1];
    const p = newPiece(src ? { code: src.code, material: src.material, grain: src.grain } : {});
    const i = after ? pieces.indexOf(after) + 1 : pieces.length;
    onChange([...pieces.slice(0, i), p, ...pieces.slice(i)], false);
    setFocusId(p.id);
  };

  const duplicate = (p: Piece) => {
    const i = pieces.indexOf(p);
    const c = { ...p, id: newPiece().id };
    onChange([...pieces.slice(0, i + 1), c, ...pieces.slice(i + 1)], false);
  };

  const onKeyDown = (e: KeyboardEvent, p: Piece) => {
    if (e.key === "Enter" && !(e.target instanceof HTMLSelectElement)) {
      e.preventDefault();
      if (p === pieces[pieces.length - 1]) add(p);
      else setFocusId(pieces[pieces.indexOf(p) + 1].id);
    }
  };

  const pcs = pieces.reduce((a, p) => a + (p.qty > 0 ? p.qty : 0), 0);
  const matNames = s.materials.map(m => m.name);

  return (
    <div class="editor">
      <div class="ed-bar">
        <button class="btn primary" type="button" onClick={() => add()}>+ {t.add_piece}</button>
        <button class="btn" type="button" disabled={!canUndo} onClick={onUndo} title="Ctrl+Z">↶ {t.undo}</button>
        <button class="btn" type="button" disabled={!canRedo} onClick={onRedo} title="Ctrl+Y">↷ {t.redo}</button>
        <span class="ed-count">{t.pieces_total(pieces.length, pcs)}</span>
        {pieces.length > 0 && (confirmClear ? (
          <span class="row">
            <span class="hint" style={{ margin: 0 }}>{t.confirm_clear}</span>
            <button class="btn danger" type="button" onClick={() => { onChange([], false); setConfirmClear(false); }}>{t.yes_delete}</button>
            <button class="btn" type="button" onClick={() => setConfirmClear(false)}>{t.cancel}</button>
          </span>
        ) : (
          <button class="btn ghost" type="button" onClick={() => setConfirmClear(true)}>{t.clear_all}</button>
        ))}
      </div>

      <div class="ed-scroll">
        <table class="ed" ref={tableRef}>
          <thead>
            <tr>
              <th class="n">#</th>
              <th>{t.c_name}</th>
              <th>{t.c_len}</th>
              <th></th>
              <th>{t.c_wid}</th>
              <th></th>
              <th>{t.c_qty}</th>
              <th>{t.c_mat}</th>
              <th>{t.c_grain}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pieces.map((p, i) => {
              const fromCode = materialOf({ ...p, material: undefined }, s);
              const mat = matInfo(materialOf(p, s), s);
              const g = effectiveGrain(p, mat);
              const bad = !(p.L > 0 && p.W > 0 && p.qty > 0);
              const big = !bad && !fitsBoard(p, s);
              return (
                <tr key={p.id} data-row={p.id} class={bad ? "bad" : big ? "warn" : ""} title={big ? t.too_big : undefined}
                  onKeyDown={e => onKeyDown(e as unknown as KeyboardEvent, p)}>
                  <td class="n idx">{i + 1}</td>
                  <td><input id={`n-${p.id}`} type="text" class="ed-name" value={p.name} onInput={e => update(p.id, { name: e.currentTarget.value })} /></td>
                  <td><NumInput id={`L-${p.id}`} value={p.L} onValue={v => update(p.id, { L: v })} /></td>
                  <td><EdgeCell id={`Le-${p.id}`} value={p.Le} t={t} onValue={v => update(p.id, { Le: v }, false)} /></td>
                  <td><NumInput id={`W-${p.id}`} value={p.W} onValue={v => update(p.id, { W: v })} /></td>
                  <td><EdgeCell id={`We-${p.id}`} value={p.We} t={t} onValue={v => update(p.id, { We: v }, false)} /></td>
                  <td><NumInput id={`q-${p.id}`} value={p.qty} int onValue={v => update(p.id, { qty: v })} class="narrow" /></td>
                  <td>
                    <input id={`m-${p.id}`} type="text" class="ed-mat" list="matSuggest" value={p.material ?? ""}
                      placeholder={fromCode} title={p.material ? undefined : `${t.mat_auto}: ${fromCode}`}
                      onInput={e => update(p.id, { material: e.currentTarget.value || undefined })} />
                  </td>
                  <td>
                    <button type="button" class={"grain-btn" + (p.grain === undefined ? " auto" : "")}
                      title={`${p.grain === undefined ? t.grain_auto + ": " : ""}${g === "L" ? t.grain_L : g === "W" ? t.grain_W : t.grain_free}`}
                      onClick={() => update(p.id, { grain: GRAIN_CYCLE[(GRAIN_CYCLE.indexOf(p.grain) + 1) % GRAIN_CYCLE.length] }, false)}>
                      {GRAIN_MARK[g] || "∅"}
                    </button>
                  </td>
                  <td class="ed-act">
                    <button type="button" class="icon" title={t.dup_piece} aria-label={t.dup_piece} onClick={() => duplicate(p)}>⧉</button>
                    <button type="button" class="icon" title={t.del_piece} aria-label={t.del_piece}
                      onClick={() => onChange(pieces.filter(x => x.id !== p.id), false)}>✕</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={10}>
                <button type="button" class="ed-add" onClick={() => add()}>+ {t.add_piece}</button>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <datalist id="matSuggest">{matNames.map(v => <option key={v} value={v} />)}</datalist>
      <p class="hint">{t.editor_hint}</p>
    </div>
  );
}

function EdgeCell({ id, value, onValue, t }: { id: string; value: Edge; onValue: (v: Edge) => void; t: Texts }) {
  return (
    <select id={id} class="ed-edge" value={value} aria-label={t.c_band} title={[t.edge_none, t.edge_one, t.edge_two][value]}
      onChange={e => onValue(Number(e.currentTarget.value) as Edge)}>
      <option value={0} title={t.edge_none}>{"∅"}</option>
      <option value={1} title={t.edge_one}>{"—"}</option>
      <option value={2} title={t.edge_two}>=</option>
    </select>
  );
}
