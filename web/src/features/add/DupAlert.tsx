import { useEffect, useRef } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { C } from "@/domain/copy.js";

// Asks, never blocks. Announced when it appears; focus moves to its message.
export function DupAlert({ text, onCancel, onOk }: { text: string; onCancel: () => void; onOk: () => void }) {
  const msg = useRef<HTMLParagraphElement>(null);
  useEffect(() => { msg.current?.focus(); }, [text]);
  return (
    <div id="dup" role="alert" className="border-t border-warning-border bg-warning-bg px-5 py-3 text-warning-fg">
      <div className="mx-auto flex max-w-xl flex-col gap-3">
        <div className="flex items-start gap-2">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warning-icon" aria-hidden="true" />
          <div><p className="font-medium">{C.dupTitle}</p><p id="dup-msg" ref={msg} tabIndex={-1} className="outline-none">{text}</p></div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="h-11 flex-1 text-body" data-act="dup-cancel" onClick={onCancel}>{C.dupCancel}</Button>
          <Button className="h-11 flex-1 text-body" data-act="dup-ok" onClick={onOk}>{C.dupOk}</Button>
        </div>
      </div>
    </div>
  );
}
