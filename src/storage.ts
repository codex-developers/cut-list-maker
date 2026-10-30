// Everything is kept in the browser's IndexedDB. Projects and settings use separate stores.
import { createStore, get, set, del, values, setMany } from "idb-keyval";
import { normalizeSettings, type Project, type Settings } from "./model";

const projects = createStore("lista-e-prerjes-projects", "projects");
const settings = createStore("lista-e-prerjes-settings", "settings");

export async function loadSettings(): Promise<Settings> {
  return normalizeSettings(await get<Partial<Settings>>("settings", settings));
}

export const saveSettings = (s: Settings) => set("settings", s, settings);

/** True only the very first time the app opens in this browser; used to add the example project once. */
export async function takeFirstRun(): Promise<boolean> {
  if (await get("seeded", settings)) return false;
  await set("seeded", true, settings);
  return true;
}

export async function listProjects(): Promise<Project[]> {
  const all = await values<Project>(projects);
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export const saveProject = (p: Project) => set(p.id, p, projects);
export const deleteProject = (id: string) => del(id, projects);

// ---------- backup file ----------

export interface Backup {
  app: "lista-e-prerjes";
  version: 1;
  exportedAt: string;
  settings: Settings;
  projects: Project[];
}

export async function makeBackup(): Promise<Backup> {
  return {
    app: "lista-e-prerjes",
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: await loadSettings(),
    projects: await listProjects(),
  };
}

/** Adds the backup's projects (same id overwrites) and replaces settings. Returns how many projects came in. */
export async function restoreBackup(data: unknown): Promise<number> {
  const b = data as Partial<Backup>;
  if (!b || b.app !== "lista-e-prerjes" || !Array.isArray(b.projects)) throw new Error("not a backup");
  await setMany(b.projects.map(p => [p.id, p] as [string, Project]), projects);
  if (b.settings) await saveSettings(normalizeSettings(b.settings));
  return b.projects.length;
}
