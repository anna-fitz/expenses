import { useEffect, useRef, useState, type ReactNode } from "react";
import { Dialog as D } from "radix-ui";
import { Announcer } from "./Announcer";

// A full-screen task sheet: named by its title, focus moves to the title and stays inside,
// Escape or the phone's Back closes it, and focus returns to whatever opened it.
export function Sheet({ title, step, context, headerAction, banner, actions, onClose, children }: {
  title: string; step?: string; context?: ReactNode; headerAction?: ReactNode; banner?: ReactNode; actions: ReactNode; onClose: () => void; children: ReactNode;
}) {
  const h1 = useRef<HTMLHeadingElement>(null);
  // Radix returns focus only to a Dialog.Trigger; these sheets open from the URL, so remember what had focus.
  const [opener] = useState(() => document.activeElement as HTMLElement | null);
  const returnFocus = (e: Event) => {
    e.preventDefault();
    (opener?.isConnected && opener !== document.body ? opener : document.getElementById("screen-title"))?.focus();
  };
  useEffect(() => { const prev = document.title; document.title = `${title} · Expenses`; return () => { document.title = prev; }; }, [title]);
  const scroll = useRef<HTMLDivElement>(null);
  useEffect(() => { h1.current?.focus(); scroll.current?.scrollTo(0, 0); }, [title]);   // a new step is a new screen: focus its title, start at its top
  // A toast with actions stays until dismissed; while a sheet covers the page, hide it (index.css) instead of letting it cover the sheet.
  useEffect(() => { document.documentElement.dataset.sheet = ""; return () => { delete document.documentElement.dataset.sheet; }; }, []);
  return (
    <D.Root open onOpenChange={(o) => { if (!o) onClose(); }}>
      <D.Portal>
        <D.Content id="layer" aria-labelledby="layer-title" aria-describedby={undefined}
          onOpenAutoFocus={(e) => { e.preventDefault(); h1.current?.focus(); }} onCloseAutoFocus={returnFocus}
          className="fixed inset-0 z-50 flex flex-col bg-background outline-none duration-200 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-4">
          <header className="top px-5 pt-[calc(env(safe-area-inset-top)+16px)] pb-3">
            <div className="mx-auto flex max-w-xl items-start gap-3">
              <div className="min-w-0 flex-1">
                <h1 id="layer-title" ref={h1} tabIndex={-1} className="text-title outline-none">{title}</h1>
                {step && <p className="step text-caption text-muted-foreground">{step}</p>}
                {context}
              </div>
              {headerAction}
            </div>
          </header>
          <div ref={scroll} className="scroll flex-1 overflow-y-auto px-5 pb-4"><div className="mx-auto flex min-h-full max-w-xl flex-col gap-4">{children}</div></div>
          {banner}
          <footer className="dock border-t bg-card px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
            <div className="mx-auto flex max-w-xl gap-3">{actions}</div>
          </footer>
          <Announcer />
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
