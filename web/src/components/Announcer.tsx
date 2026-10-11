import { useEffect, useState } from "react";
let say: ((t: string) => void) | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
// Speaks short updates (the amount as it's typed) through a polite live region inside the open sheet.
// It lives inside the sheet because a modal hides everything outside it from screen readers.
export function announce(text: string, delay = 0) { clearTimeout(timer); timer = setTimeout(() => say?.(text), delay); }
export function Announcer() {
  const [t, setT] = useState("");
  useEffect(() => { say = setT; return () => { if (say === setT) say = null; }; }, []);
  return <p id="announcer" role="status" aria-live="polite" className="sr-only">{t}</p>;
}
