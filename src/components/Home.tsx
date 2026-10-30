import { useState } from "preact/hooks";
import { LANGS, newProject, uid, type Lang, type Project, type Settings } from "../model";
import { fmtDate, type Texts } from "../i18n";
import { projectNameFromFile, readPieceFile } from "../parse";
import { downloadJson, pickFile, useFileDrop } from "../hooks";
import { makeBackup, restoreBackup } from "../storage";
import { stats } from "../sheet";
import { openProject } from "../router";

interface Props {
  projects: Project[];
  settings: Settings;
  t: Texts;
  onSettings: (patch: Partial<Settings>) => void;
  onAdd: (p: Project) => Promise<Project>;
  onUpdate: (p: Project) => void;
  onRemove: (id: string) => Promise<void>;
  onRestored: () => Promise<void>;
}

export function Home({ projects, settings, t, onSettings, onAdd, onUpdate, onRemove, onRestored }: Props) {
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);

  const importFile = async (f: File | null) => {
    if (!f) return;
    const { pieces, skipped } = await readPieceFile(f);
    if (!pieces.length) { setMsg({ text: t.nothing, bad: true }); return; }
    const p = await onAdd(newProject(projectNameFromFile(f.name) || t.untitled, pieces));
    if (skipped) setMsg({ text: t.loaded(pieces.length, skipped) });
    openProject(p.id);
  };
  useFileDrop(importFile);

  const create = async () => openProject((await onAdd(newProject(t.untitled))).id);

  const duplicate = (p: Project) => {
    const now = Date.now();
    onAdd({ ...p, id: uid(), name: p.name + t.copy_suffix, pieces: p.pieces.map(x => ({ ...x, id: uid() })), createdAt: now, updatedAt: now });
  };

  const backup = async () => downloadJson(`lista-e-prerjes-${fmtDate().split(".").reverse().join("-")}.json`, await makeBackup());

  const restore = async () => {
    const f = await pickFile(".json,application/json");
    if (!f) return;
    try {
      const n = await restoreBackup(JSON.parse(await f.text()));
      await onRestored();
      setMsg({ text: t.restored(n) });
    } catch {
      setMsg({ text: t.restore_bad, bad: true });
    }
  };

  return (
    <div class="home">
      <header class="topbar">
        <div>
          <h1 class="brand">{t.app}</h1>
          <p class="tagline">{t.tagline}</p>
        </div>
        <div class="row">
          <a class="btn ghost" href="#/settings">⚙ {t.settings}</a>
          <select id="homeLang" aria-label={t.o_lang} value={settings.lang} onChange={e => onSettings({ lang: e.currentTarget.value as Lang })}>
            {LANGS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
        </div>
      </header>

      <div class="home-actions">
        <button class="btn primary" type="button" onClick={create}>+ {t.new_project}</button>
        <button class="btn" type="button" onClick={async () => importFile(await pickFile(".txt,.csv,.tsv,text/plain"))}>{t.import_txt}</button>
        <span class="hint">{t.drop_home}</span>
      </div>
      {msg && <p class={"status" + (msg.bad ? " bad" : "")}>{msg.text}</p>}

      <section class="plist" aria-label={t.projects}>
        <h2 class="section-title">{t.projects}</h2>
        {!projects.length && <p class="hint">{t.no_projects}</p>}
        {projects.map(p => (
          <ProjectRow key={p.id} p={p} t={t} onUpdate={onUpdate} onRemove={onRemove} onDuplicate={duplicate} />
        ))}
      </section>

      <section class="backup">
        <p class="hint">{t.backup_hint}</p>
        <div class="row">
          <button class="btn" type="button" onClick={backup}>{t.backup}</button>
          <button class="btn" type="button" onClick={restore}>{t.restore}</button>
        </div>
      </section>
    </div>
  );
}

function ProjectRow({ p, t, onUpdate, onRemove, onDuplicate }: {
  p: Project; t: Texts;
  onUpdate: (p: Project) => void; onRemove: (id: string) => Promise<void>; onDuplicate: (p: Project) => void;
}) {
  const [mode, setMode] = useState<"view" | "rename" | "delete">("view");
  const [name, setName] = useState(p.name);
  const st = stats(p.pieces);

  const commitName = () => { onUpdate({ ...p, name: name.trim() || t.untitled }); setMode("view"); };

  return (
    <article class="prow">
      <div class="prow-main">
        {mode === "rename" ? (
          <input
            id={`rename-${p.id}`} type="text" value={name} autoFocus
            onInput={e => setName(e.currentTarget.value)}
            onKeyDown={e => { if (e.key === "Enter") commitName(); if (e.key === "Escape") setMode("view"); }}
            onBlur={commitName}
          />
        ) : (
          <a class="prow-name" href={`#/p/${p.id}`}>{p.name || t.untitled}</a>
        )}
        <span class="prow-meta">{st.pcs} {t.pcs} · {t.updated} {fmtDate(p.updatedAt)}</span>
      </div>
      {mode === "delete" ? (
        <div class="row confirm">
          <span>{t.confirm_delete}</span>
          <button class="btn danger" type="button" onClick={() => onRemove(p.id)}>{t.yes_delete}</button>
          <button class="btn" type="button" onClick={() => setMode("view")}>{t.cancel}</button>
        </div>
      ) : (
        <div class="row prow-actions">
          <button class="btn ghost" type="button" onClick={() => { setName(p.name); setMode("rename"); }}>{t.rename}</button>
          <button class="btn ghost" type="button" onClick={() => onDuplicate(p)}>{t.duplicate}</button>
          <button class="btn ghost" type="button" onClick={() => setMode("delete")}>{t.del}</button>
        </div>
      )}
    </article>
  );
}
