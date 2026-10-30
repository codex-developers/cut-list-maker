/** "#/p/<id>" opens a project; anything else is the project list. */
export const readRoute = (): string | null => location.hash.match(/^#\/p\/(.+)$/)?.[1] ?? null;

export const openProject = (id: string | null) => {
  location.hash = id ? `#/p/${id}` : "";
};
