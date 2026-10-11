import { useEffect, type RefObject } from "react";
let navigated = false;
export const markNavigated = () => { navigated = true; };
// Names the page; after navigation (or when asked), moves focus to the new screen's title (WCAG 2.4.3).
export function useScreen(title: string | null, h1: RefObject<HTMLHeadingElement | null>, focusNow = false) {
  useEffect(() => {
    document.title = title ? `${title} · Expenses` : "Expenses";
    if ((navigated || focusNow) && h1.current) { h1.current.focus(); navigated = false; }
  }, [title, h1, focusNow]);
}
