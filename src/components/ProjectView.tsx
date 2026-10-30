import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { ensureMaterial, findMaterial, LANGS, type Lang, type Piece, type Project, type Settings } from "../model";
import type { Texts } from "../i18n";
import { parsePieces, readPieceFile } from "../parse";
import { pickFile, useFileDrop } from "../hooks";
import { bandedMaterials, buildGroups, mergeKey, rowNumbers, toRow } from "../sheet";
import { optimize } from "../optimizer";
import { CutSheet, COLS, SheetHeader } from "./CutSheet";
import { PieceEditor } from "./PieceEditor";
import { Plan } from "./Plan";

interface Props {
  project: Project;
  settings: Settings;
  t: Texts;
  onProject: (p: Project) => void;
  onSettings: (patch: Partial<Settings>) => void;
}

type Tab = "pieces" | "sheet" | "plan";

export function ProjectView({ project: p, settings: s, t, onProject, onSettings }: Props) {
  const [tab, setTab] = useState<Tab>(p.pieces.length ? "sheet" : "pieces");
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  /** Pieces read from a file, waiting for "replace" or "add" when the project already has pieces. */
  const [pending, setPending] = useState<Piece[] | null>(null);
  const [paste, setPaste] = useState("");

  const set = (patch: Partial<Project>) => onProject({ ...p, ...patch });

  // ---------- undo history of the piece list ----------
  const hist = useRef({ past: [] as Piece[][], future: [] as Piece[][], last: 0 });
  /** coalesce: typing in one cell within a second counts as one undo step. */
  const setPieces = (pieces: Piece[], coalesce = false) => {
    const h = hist.current;
    const now = Date.now();
    if (!(coalesce && now - h.last < 1000)) {
      h.past.push(p.pieces);
      if (h.past.length > 100) h.past.shift();
    }
    h.last = coalesce ? now : 0;
    h.future = [];
    set({ pieces });
  };
  const undo = () => {
    const h = hist.current;
    const prev = h.past.pop();
    if (!prev) return;
    h.future.push(p.pieces);
    h.last = 0;
    set({ pieces: prev });
  };
  const redo = () => {
    const h = hist.current;
    const next = h.future.pop();
    if (!next) return;
    h.past.push(p.pieces);
    h.last = 0;
    set({ pieces: next });
  };
  const keys = useRef({ undo, redo });
  keys.current = { undo, redo };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const el = e.target as HTMLElement;
      // Inside a text field the browser's own undo handles the typing.
      if (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && (el as HTMLInputElement).type === "text")) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) { e.preventDefault(); keys.current.undo(); }
      else if (k === "y" || (k === "z" && e.shiftKey)) { e.preventDefault(); keys.current.redo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ---------- import ----------
  const take = ({ pieces, skipped }: { pieces: Piece[]; skipped: number }) => {
    if (!pieces.length) { setMsg({ text: t.nothing, bad: true }); return; }
    setMsg({ text: t.loaded(pieces.length, skipped) });
    if (p.pieces.length) setPending(pieces);
    else setPieces(pieces);
  };
  const importFile = async (f: File | null) => { if (f) take(await readPieceFile(f)); };
  useFileDrop(importFile);

  // ---------- derived ----------
  const groups = useMemo(() => buildGroups(p.pieces, s), [p.pieces, s]);
  const needPlan = tab === "plan" || s.printDiagrams;
  const plans = useMemo(() => {
    if (!needPlan) return [];
    const nr = rowNumbers(groups, s);
    const rows = p.pieces.filter(x => x.L > 0 && x.W > 0 && x.qty > 0).map(x => toRow(x, s));
    return optimize(rows, r => nr.get(mergeKey(r, s)) ?? 0, s);
  }, [needPlan, groups, p.pieces, s]);

  const codes = [...new Set(p.pieces.map(x => x.code))].sort();
  const parts = [...new Set(p.pieces.map(x => x.name).filter(Boolean))].sort();
  const banded = bandedMaterials(p.pieces, s);

  const setBand = (matName: string, bandId: string) => {
    const materials = s.materials.map(m => ({ ...m }));
    ensureMaterial({ ...s, materials }, matName).bandId = bandId;
    onSettings({ materials });
  };

  const print = () => {
    const old = document.title;
    if (p.name.trim()) document.title = `${t.s_kind} - ${p.name.trim()}`; // becomes the PDF file name
    window.print();
    document.title = old;
  };

  const planSheet = (
    <div class="sheet plan-sheet">
      <SheetHeader title={p.name} s={s} t={t} />
      <Plan plans={plans} s={s} t={t} />
    </div>
  );

  return (
    <>
      <div class="app screen-only">
        <aside class="bench">
          <nav class="row bench-nav">
            <a class="back" href="#">← {t.back}</a>
            <a class="back" href="#/settings">{t.settings} ⚙</a>
          </nav>

          <div class="box">
            <h2>{t.h_order}</h2>
            <label class="field"><span>{t.f_project}</span>
              <input id="project" type="text" value={p.name} onInput={e => set({ name: e.currentTarget.value })} />
            </label>
            <label class="field"><span>{t.f_note}</span>
              <textarea id="note" class="plain" value={p.note} onInput={e => set({ note: e.currentTarget.value })} />
            </label>
            <p class="hint"><a href="#/settings">{t.workshop_hint}</a></p>
          </div>

          <div class="box">
            <h2>{t.h_file}</h2>
            <button class="drop" type="button" onClick={async () => importFile(await pickFile(".txt,.csv,.tsv,text/plain"))}>
              <strong>{t.drop_main}</strong><span>{t.drop_sub}</span>
            </button>
            <details>
              <summary>{t.paste_toggle}</summary>
              <textarea id="paste" spellcheck={false} value={paste} onInput={e => setPaste(e.currentTarget.value)} />
              <div class="row" style={{ marginTop: "8px" }}>
                <button class="btn" type="button" onClick={() => take(parsePieces(paste))}>{t.paste_btn}</button>
              </div>
            </details>
            {pending && (
              <div class="choice">
                <p>{t.import_mode}</p>
                <div class="row">
                  <button class="btn" type="button" onClick={() => { setPieces(pending); setPending(null); }}>{t.replace}</button>
                  <button class="btn" type="button" onClick={() => { setPieces([...p.pieces, ...pending]); setPending(null); }}>{t.append}</button>
                  <button class="btn ghost" type="button" onClick={() => setPending(null)}>{t.cancel}</button>
                </div>
              </div>
            )}
            {msg && <div class={"status" + (msg.bad ? " bad" : "")}>{msg.text}</div>}
          </div>

          {p.pieces.length > 0 && (
            <div class="box">
              <h2>{t.h_mat}</h2>
              <p class="hint">{t.mat_hint}</p>
              <div class="map">
                {codes.map((c, i) => [
                  <label key={"l" + c} class="code" for={`cm${i}`}>{c ? c : <em>{t.main_board}</em>}</label>,
                  <input key={"i" + c} id={`cm${i}`} type="text" list="matSuggest" placeholder={c} value={s.codeMap[c] || ""}
                    onInput={e => onSettings({ codeMap: { ...s.codeMap, [c]: e.currentTarget.value } })} />,
                ])}
              </div>
              {parts.length > 0 && (
                <details>
                  <summary>{t.part_toggle}</summary>
                  <p class="hint" style={{ marginBottom: "8px" }}>{t.part_hint}</p>
                  <div class="map">
                    {parts.map((n, i) => [
                      <label key={"l" + n} class="code" for={`pm${i}`}>{n}</label>,
                      <input key={"i" + n} id={`pm${i}`} type="text" list="matSuggest" placeholder={t.same} value={s.partMap[n] || ""}
                        onInput={e => onSettings({ partMap: { ...s.partMap, [n]: e.currentTarget.value } })} />,
                    ])}
                  </div>
                </details>
              )}
            </div>
          )}

          {banded.length > 0 && (
            <div class="box">
              <h2>{t.h_band}</h2>
              <p class="hint">{t.band_hint}</p>
              <div class="map">
                {banded.map((m, i) => [
                  <label key={"l" + m} class="code" for={`bm${i}`}>{m}</label>,
                  <select key={"i" + m} id={`bm${i}`} value={findMaterial(m, s)?.bandId ?? ""} onChange={e => setBand(m, e.currentTarget.value)}>
                    <option value="">{t.no_band}</option>
                    {s.bands.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
                  </select>,
                ])}
              </div>
            </div>
          )}

          <div class="box">
            <h2>{t.h_opts}</h2>
            <label class="check"><input id="optGroup" type="checkbox" checked={s.group} onChange={e => onSettings({ group: e.currentTarget.checked })} /> {t.o_group}</label>
            <label class="check"><input id="optMerge" type="checkbox" checked={s.merge} onChange={e => onSettings({ merge: e.currentTarget.checked })} /> {t.o_merge}</label>
            <label class="check"><input id="optDiag" type="checkbox" checked={s.printDiagrams} onChange={e => onSettings({ printDiagrams: e.currentTarget.checked })} /> {t.o_diagrams}</label>
            <label class="field"><span>{t.o_lang}</span>
              <select id="lang" value={s.lang} onChange={e => onSettings({ lang: e.currentTarget.value as Lang })}>
                {LANGS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
              </select>
            </label>
          </div>

          <div class="box">
            <h2>{t.h_cols}</h2>
            <div class="cols">
              {COLS.map(c => (
                <label key={c.k} class="check">
                  <input id={`col_${c.k}`} type="checkbox" checked={s.cols[c.k]}
                    onChange={e => onSettings({ cols: { ...s.cols, [c.k]: e.currentTarget.checked } })} />
                  {t[c.label] as string}
                </label>
              ))}
            </div>
          </div>

          <div class="row"><button class="btn primary wide" type="button" onClick={print}>{t.print}</button></div>
          <p class="hint">{t.print_hint}</p>
        </aside>

        <main class="main">
          <div class="tabs" role="tablist">
            {(["pieces", "sheet", "plan"] as Tab[]).map(k => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} class={"tab" + (tab === k ? " on" : "")} onClick={() => setTab(k)}>
                {k === "pieces" ? t.tab_pieces : k === "sheet" ? t.tab_sheet : t.tab_plan}
              </button>
            ))}
          </div>
          {tab === "pieces" && (
            <PieceEditor pieces={p.pieces} settings={s} t={t} onChange={setPieces}
              canUndo={hist.current.past.length > 0} canRedo={hist.current.future.length > 0} onUndo={undo} onRedo={redo} />
          )}
          {tab === "sheet" && <div class="sheet-wrap"><CutSheet project={p} groups={groups} settings={s} t={t} /></div>}
          {tab === "plan" && <div class="sheet-wrap">{planSheet}</div>}
        </main>
      </div>

      {/* What the printer gets, whatever tab is open. */}
      <div class="print-only">
        <CutSheet project={p} groups={groups} settings={s} t={t} />
        {s.printDiagrams && plans.length > 0 && planSheet}
      </div>
    </>
  );
}
