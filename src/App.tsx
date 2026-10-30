import { useEffect, useRef, useState } from "preact/hooks";
import { newProject, type Project, type Settings } from "./model";
import { TEXTS } from "./i18n";
import * as db from "./storage";
import { parsePieces } from "./parse";
import { SAMPLE_TXT } from "./sample";
import { Home } from "./components/Home";
import { ProjectView } from "./components/ProjectView";
import { SettingsView } from "./components/SettingsView";
import { readRoute } from "./router";

export function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [route, setRoute] = useState(readRoute());
  const timers = useRef(new Map<string, number>());

  useEffect(() => {
    const onHash = () => setRoute(readRoute());
    window.addEventListener("hashchange", onHash);
    (async () => {
      const s = await db.loadSettings();
      let list = await db.listProjects();
      if (await db.takeFirstRun() && !list.length) {
        const sample = newProject(TEXTS[s.lang].sample_name, parsePieces(SAMPLE_TXT).pieces);
        await db.saveProject(sample);
        list = [sample];
      }
      setSettings(s);
      setProjects(list);
    })();
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (settings) document.documentElement.lang = settings.lang;
  }, [settings?.lang]);

  if (!settings || !projects) return null;
  const t = TEXTS[settings.lang];

  const updateSettings = (patch: Partial<Settings>) => {
    setSettings(prev => {
      const next = { ...(prev as Settings), ...patch };
      db.saveSettings(next);
      return next;
    });
  };

  // Typing in a project saves at most every 300 ms.
  const updateProject = (p: Project) => {
    const next = { ...p, updatedAt: Date.now() };
    setProjects(list => [next, ...(list || []).filter(x => x.id !== p.id)]);
    const old = timers.current.get(p.id);
    if (old) clearTimeout(old);
    timers.current.set(p.id, window.setTimeout(() => { timers.current.delete(p.id); db.saveProject(next); }, 300));
  };

  const addProject = async (p: Project) => {
    await db.saveProject(p);
    setProjects(list => [p, ...(list || [])]);
    return p;
  };

  const removeProject = async (id: string) => {
    await db.deleteProject(id);
    setProjects(list => (list || []).filter(x => x.id !== id));
  };

  const reload = async () => {
    setSettings(await db.loadSettings());
    setProjects(await db.listProjects());
  };

  if (route.view === "settings") return <SettingsView settings={settings} t={t} onSettings={updateSettings} />;
  const current = route.view === "project" ? projects.find(p => p.id === route.id) : undefined;
  if (current) {
    return <ProjectView key={current.id} project={current} settings={settings} t={t} onProject={updateProject} onSettings={updateSettings} />;
  }
  return (
    <Home
      projects={projects}
      settings={settings}
      t={t}
      onSettings={updateSettings}
      onAdd={addProject}
      onUpdate={updateProject}
      onRemove={removeProject}
      onRestored={reload}
    />
  );
}
