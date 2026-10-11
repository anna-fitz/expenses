import { Delete } from "lucide-react";
import { C } from "@/domain/copy.js";
import { cn } from "@/lib/utils";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"];
// Sized like iPhone's built-in number pad: ~46px keys, ~6px gaps and corners, regular-weight digits, edge to edge,
// with "." and delete sitting on the pad without a key face. Plain buttons, not shadcn Buttons: the digits are larger than button text.
// The negative margins cancel the sheet body's side and bottom padding, so the pad sits flush like the system keypad.
export function NumberPad({ onKey }: { onKey: (k: string) => void }) {
  return (
    <div className="keys -mx-5 -mb-4 grid grid-cols-3 gap-1.5 bg-muted p-1.5">
      {KEYS.map((k) => {
        const plain = k === "back" || k === ".";
        return (
          <button key={k} type="button" data-act="key" data-k={k} onClick={() => onKey(k)}
            aria-label={k === "back" ? C.deleteDigit : k === "." ? C.decimal : undefined}
            className={cn("flex h-[46px] items-center justify-center rounded-[6px] text-[28px] leading-none font-normal tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring",
              plain ? "bg-transparent active:bg-card" : "bg-card shadow-[0_1px_0_rgb(0_0_0/0.15)] active:bg-background")}>
            {k === "back" ? <Delete className="size-6" aria-hidden="true" /> : k}
          </button>
        );
      })}
    </div>
  );
}
