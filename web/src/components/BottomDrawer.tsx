import { useRef, type ReactNode } from "react";
import { Dialog as D } from "radix-ui";

// A drawer that slides up over a sheet (design language: Sheet → Drawer on phones). A Radix dialog, so it's named by its title,
// keeps focus inside, and closes on Escape without closing the sheet under it. Focus starts on `initialFocus` (else the title)
// and returns to `focusAfterClose` if that's on screen, else to whatever opened it.
export function BottomDrawer({ id, title, description, open, onClose, initialFocus, focusAfterClose, footer, children }: {
  id: string; title: string; description?: string; open: boolean; onClose: () => void; initialFocus?: string; focusAfterClose?: string; footer: ReactNode; children: ReactNode;
}) {
  const opener = useRef<HTMLElement | null>(null);
  return (
    <D.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <D.Content id={id} aria-labelledby={`${id}-title`} aria-describedby={description ? `${id}-help` : undefined}
          onOpenAutoFocus={(e) => {
            opener.current = document.activeElement as HTMLElement | null;
            e.preventDefault();
            ((initialFocus && document.querySelector<HTMLElement>(`#${id} ${initialFocus}`)) || document.getElementById(`${id}-title`))?.focus();
          }}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            const after = focusAfterClose ? document.querySelector<HTMLElement>(focusAfterClose) : null;
            (after || (opener.current?.isConnected ? opener.current : document.getElementById("layer-title")))?.focus();
          }}
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-[20px] border-t bg-background shadow-[0_8px_24px_rgb(0_0_0/0.12)] outline-none duration-200 data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom dark:shadow-none">
          <header className="px-5 pt-5 pb-2">
            <h2 id={`${id}-title`} tabIndex={-1} className="mx-auto max-w-xl text-heading outline-none">{title}</h2>
            {description && <p id={`${id}-help`} className="mx-auto mt-1 max-w-xl text-caption text-muted-foreground">{description}</p>}
          </header>
          <div className="flex-1 overflow-y-auto px-5 pb-4"><div className="mx-auto max-w-xl">{children}</div></div>
          <footer className="border-t px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)]"><div className="mx-auto max-w-xl">{footer}</div></footer>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
