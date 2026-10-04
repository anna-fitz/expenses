import { useRef, type ReactNode } from "react";
import { markNavigated, useScreen } from "@/app/useScreen";
import { C } from "@/domain/copy.js";

// A page inside the Settings tab: a back link, then its title (focused on arrival), like Privacy & security.
export function SettingsPage({ title, heading, lead, children }: { title: string; heading?: string; lead?: ReactNode; children: ReactNode }) {
  const h1 = useRef<HTMLHeadingElement>(null);
  useScreen(title, h1, true);
  return (
    <div className="flex flex-col gap-6">
      <a href="#/settings" data-act="back-settings" onClick={markNavigated}
        className="inline-flex min-h-11 items-center self-start text-caption text-muted-foreground underline underline-offset-4">← {C.tabSettings}</a>
      <div className="flex items-center gap-4">
        {lead}
        <h1 id="screen-title" ref={h1} tabIndex={-1} className="text-title outline-none">{heading ?? title}</h1>
      </div>
      {children}
    </div>
  );
}
