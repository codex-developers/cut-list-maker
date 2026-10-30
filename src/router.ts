export type Route = { view: "home" } | { view: "settings" } | { view: "project"; id: string };

/** "#/p/<id>" opens a project, "#/settings" the settings; anything else is the project list. */
export function readRoute(): Route {
  const h = location.hash;
  const m = h.match(/^#\/p\/(.+)$/);
  if (m) return { view: "project", id: m[1] };
  if (h === "#/settings") return { view: "settings" };
  return { view: "home" };
}

export const openProject = (id: string | null) => {
  location.hash = id ? `#/p/${id}` : "";
};
