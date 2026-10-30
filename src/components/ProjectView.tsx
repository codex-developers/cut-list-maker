import { useState } from "preact/hooks";
import { LANGS, type Lang, type Piece, type Project, type Settings } from "../model";
import type { Texts } from "../i18n";
import { parsePieces, readPieceFile } from "../parse";
import { pickFile, useFileDrop } from "../hooks";
import { bandedMaterials } from "../sheet";
import { CutSheet, COLS } from "./CutSheet";

interface Props {
  project: Project;
  settings: Settings;
  t: Texts;
  onProject: (p: Project) => void;
  onSettings: (patch: Partial<Settings>) => void;
}

export function ProjectView({ project: p, settings: s, t, onProject, onSettings }: Props) {
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  /** Pieces read from a file, waiting for "replace" or "add" when the project already has pieces. */
  const [pending, setPending] = useState<Piece[] | null>(null);
  const [paste, setPaste] = useState("");

  const set = (patch: Partial<Project>) => onProject({ ...p, ...patch });

  const take = ({ pieces, skipped }: { pieces: Piece[]; skipped: number }) => {
    if (!pieces.length) { setMsg({ text: t.nothing, bad: true }); return; }
    setMsg({ text: t.loaded(pieces.length, skipped) });
    if (p.pieces.length) setPending(pieces);
    else set({ pieces });
  };
  const importFile = async (f: File | null) => { if (f) take(await readPieceFile(f)); };
  useFileDrop(importFile);

  const codes = [...new Set(p.pieces.map(x => x.code))].sort();
  const parts = [...new Set(p.pieces.map(x => x.name))].sort();
  const banded = bandedMaterials(p.pieces, s);

  const print = () => {
    const old = document.title;
    if (p.name.trim()) document.title = `${t.s_kind} - ${p.name.trim()}`; // becomes the PDF file name
    window.print();
    document.title = old;
  };

  return (
    <div class="app">
      <aside class="bench">
        <a class="back" href="#">← {t.back}</a>

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
                <button class="btn" type="button" onClick={() => { set({ pieces: pending }); setPending(null); }}>{t.replace}</button>
                <button class="btn" type="button" onClick={() => { set({ pieces: [...p.pieces, ...pending] }); setPending(null); }}>{t.append}</button>
                <button class="btn ghost" type="button" onClick={() => setPending(null)}>{t.cancel}</button>
              </div>
            </div>
          )}
          {msg && <div class={"status" + (msg.bad ? " bad" : "")}>{msg.text}</div>}
        </div>

        <div class="box">
          <h2>{t.h_order}</h2>
          <label class="field"><span>{t.f_project}</span>
            <input id="project" type="text" value={p.name} onInput={e => set({ name: e.currentTarget.value })} />
          </label>
          <label class="field"><span>{t.f_from}</span>
            <input id="from" type="text" value={s.from} onInput={e => onSettings({ from: e.currentTarget.value })} />
          </label>
          <label class="field"><span>{t.f_note}</span>
            <textarea id="note" class="plain" value={p.note} onInput={e => set({ note: e.currentTarget.value })} />
          </label>
        </div>

        {codes.length > 0 && (
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
          </div>
        )}

        {banded.length > 0 && (
          <div class="box">
            <h2>{t.h_band}</h2>
            <p class="hint">{t.band_hint}</p>
            <div class="map">
              {banded.map((m, i) => [
                <label key={"l" + m} class="code" for={`bm${i}`}>{m}</label>,
                <input key={"i" + m} id={`bm${i}`} type="text" list="bandSuggest" placeholder="22 × 0,8 mm" value={s.bandMap[m] || ""}
                  onInput={e => onSettings({ bandMap: { ...s.bandMap, [m]: e.currentTarget.value } })} />,
              ])}
            </div>
          </div>
        )}

        <div class="box">
          <h2>{t.h_opts}</h2>
          <label class="check"><input id="optGroup" type="checkbox" checked={s.group} onChange={e => onSettings({ group: e.currentTarget.checked })} /> {t.o_group}</label>
          <label class="check"><input id="optMerge" type="checkbox" checked={s.merge} onChange={e => onSettings({ merge: e.currentTarget.checked })} /> {t.o_merge}</label>
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

        <datalist id="matSuggest">
          {["Iveric 16mm Barok A427", "Iveric 16mm White", "Iveric 18mm White", "Lesonit 3mm White", "Iveric 25mm"].map(v => <option key={v} value={v} />)}
        </datalist>
        <datalist id="bandSuggest">
          {["22 × 0,45 mm", "22 × 0,8 mm", "22 × 1 mm", "22 × 2 mm", "28 × 2 mm"].map(v => <option key={v} value={v} />)}
        </datalist>
      </aside>

      <main class="sheet-wrap">
        <CutSheet project={p} settings={s} t={t} />
      </main>
    </div>
  );
}
