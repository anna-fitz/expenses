import { X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { C } from "@/domain/copy.js";

// A toast with actions stays until dismissed (design language). Its buttons are full 44px targets.
export function actionToast(message: string, actions: { act: string; label: string; run: () => void }[]) {
  toast.custom((t) => (
    <div id="toast" className="flex w-full items-center gap-1 rounded-xl border bg-popover py-1 pr-1 pl-4 text-popover-foreground shadow-[0_8px_24px_rgb(0_0_0/0.12)] dark:shadow-none">
      <span className="min-w-0 flex-1 text-body">{message}</span>
      {actions.map((a) => (
        <Button key={a.act} variant="ghost" className="h-11 px-3 text-body" data-toast={a.act} onClick={() => { toast.dismiss(t); a.run(); }}>{a.label}</Button>
      ))}
      <Button variant="ghost" size="icon" className="size-11" aria-label={C.dismiss} data-toast="x" onClick={() => toast.dismiss(t)}>
        <X className="size-5" aria-hidden="true" />
      </Button>
    </div>
  ), { id: "action", duration: Infinity });
}
