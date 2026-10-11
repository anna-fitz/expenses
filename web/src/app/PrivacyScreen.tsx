import { useRef } from "react";
import { C, privacySections } from "@/domain/copy.js";
import { useScreen } from "./useScreen";

export function PrivacyContent({ them }: { them: string }) {
  return (
    <div className="flex flex-col gap-4">
      {privacySections(them).map((s) => (
        <section key={s.id} id={`privacy-${s.id}`} className="rounded-xl border bg-card p-4">
          <h2 className="text-heading">{s.title}</h2>
          <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-body">{s.body.map((t) => <li key={t}>{t}</li>)}</ul>
        </section>
      ))}
    </div>
  );
}
export function PrivacyScreen({ them }: { them: string }) {
  const h1 = useRef<HTMLHeadingElement>(null);
  useScreen(C.privacyTitle, h1, true);
  return (
    <div className="flex flex-col gap-4">
      <a href="#/settings" className="inline-flex min-h-11 items-center self-start text-caption text-muted-foreground underline underline-offset-4">← {C.tabSettings}</a>
      <h1 id="screen-title" ref={h1} tabIndex={-1} className="text-title outline-none">{C.privacyTitle}</h1>
      <PrivacyContent them={them} />
    </div>
  );
}
