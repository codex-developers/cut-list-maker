import { useEffect, useState } from "preact/hooks";
import { fmtNum, readNum } from "../i18n";

interface Props {
  id: string;
  value: number;
  onValue: (v: number) => void;
  int?: boolean;
  /** Accept 0 as a real value (e.g. no edge trim). */
  zero?: boolean;
  class?: string;
}

/** Number input that keeps what is typed ("12," mid-edit) and reports only valid numbers. */
export function NumInput({ id, value, onValue, int, zero, class: cls = "" }: Props) {
  const show = (v: number) => (v || zero ? fmtNum(v) : "");
  const [text, setText] = useState(show(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setText(show(value)); }, [value, focused]);

  const valid = (n: number) => (zero ? n >= 0 : n > 0) && (!int || Number.isInteger(n));
  const ok = text.trim() === "" || valid(readNum(text));
  return (
    <input id={id} type="text" inputMode={int ? "numeric" : "decimal"} class={`num ${cls}${ok ? "" : " invalid"}`}
      value={text}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onInput={e => {
        const s = e.currentTarget.value;
        setText(s);
        const n = readNum(s);
        if (valid(n)) onValue(n);
        else if (s.trim() === "") onValue(0);
      }} />
  );
}
