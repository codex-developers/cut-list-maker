import { useEffect, useRef } from "preact/hooks";

/** Calls onFile for a file dropped anywhere on the page. */
export function useFileDrop(onFile: (f: File) => void) {
  const cb = useRef(onFile);
  cb.current = onFile;
  useEffect(() => {
    const over = (e: DragEvent) => { e.preventDefault(); document.body.classList.add("dragging"); };
    const leave = (e: DragEvent) => { if (!e.relatedTarget) document.body.classList.remove("dragging"); };
    const drop = (e: DragEvent) => {
      e.preventDefault();
      document.body.classList.remove("dragging");
      const f = e.dataTransfer?.files[0];
      if (f) cb.current(f);
    };
    window.addEventListener("dragover", over);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragover", over);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
    };
  }, []);
}

/** Opens the system file picker and resolves with the chosen file. */
export function pickFile(accept: string): Promise<File | null> {
  return new Promise(resolve => {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = accept;
    inp.onchange = () => resolve(inp.files?.[0] ?? null);
    inp.click();
  });
}

export function downloadJson(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
