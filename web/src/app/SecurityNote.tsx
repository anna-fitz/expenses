import { Lock } from "lucide-react";
import type { ReactNode } from "react";
export function SecurityNote({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} className="flex items-start gap-2 text-caption text-muted-foreground">
      <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span>{children}</span>
    </p>
  );
}
