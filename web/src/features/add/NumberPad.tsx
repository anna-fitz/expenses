import { Delete } from "lucide-react";
import { C } from "@/domain/copy.js";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"];
// The design language's custom number pad. Plain buttons (not shadcn Buttons): its digits are larger than button text.
export function NumberPad({ onKey }: { onKey: (k: string) => void }) {
  return (
    <div className="keys grid grid-cols-3 gap-2">
      {KEYS.map((k) => (
        <button key={k} type="button" data-act="key" data-k={k} onClick={() => onKey(k)}
          aria-label={k === "back" ? C.deleteDigit : k === "." ? C.decimal : undefined}
          className="flex h-14 items-center justify-center rounded-[14px] bg-card text-title font-medium tabular-nums outline-none active:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
          {k === "back" ? <Delete className="size-6" aria-hidden="true" /> : k}
        </button>
      ))}
    </div>
  );
}
