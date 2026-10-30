// Reads the tab-separated piece list exported from the drawing program:
//   name <TAB> length <TAB> width <TAB> qty <TAB> material code
import { uid, type Edge, type Piece } from "./model";

/**
 * A size is a number followed by an optional edge mark:
 *   — (em dash, byte 0x97 in the Windows export), – or -  -> one side
 *   =                                                    -> two sides
 * The replacement char covers files that were opened with the wrong encoding.
 */
export function parseDim(s: string | undefined): { v: number; e: Edge } | null {
  const m = String(s ?? "").trim().match(/^(\d+(?:[.,]\d+)?)\s*([—–\-=�_])?$/);
  if (!m) return null;
  const mark = m[2] || "";
  return { v: parseFloat(m[1].replace(",", ".")), e: mark === "=" ? 2 : mark ? 1 : 0 };
}

export function parsePieces(text: string): { pieces: Piece[]; skipped: number } {
  const pieces: Piece[] = [];
  let skipped = 0;
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim()) continue;
    const f = raw.split("\t");
    const L = parseDim(f[1]);
    const W = parseDim(f[2]);
    const qty = parseInt(String(f[3] ?? "").trim(), 10);
    if (!L || !W || !(qty > 0)) { skipped++; continue; }
    pieces.push({ id: uid(), name: (f[0] || "").trim(), L: L.v, Le: L.e, W: W.v, We: W.e, qty, code: (f[4] || "").trim() });
  }
  return { pieces, skipped };
}

/** Windows exports are usually CP-1252; fall back to it when the bytes are not valid UTF-8. */
export function decode(buf: ArrayBuffer): string {
  try { return new TextDecoder("utf-8", { fatal: true }).decode(buf); }
  catch { return new TextDecoder("windows-1252").decode(buf); }
}

export async function readPieceFile(f: File) {
  return parsePieces(decode(await f.arrayBuffer()));
}

/** "paradhoma - piece list.txt" -> "paradhoma" */
export function projectNameFromFile(name: string): string {
  return name.replace(/\.[^.]+$/, "").replace(/\s*-\s*piece list$/i, "").trim();
}
