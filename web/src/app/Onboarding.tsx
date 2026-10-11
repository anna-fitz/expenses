import { useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useData } from "@/data/data";
import { markOnboarded } from "@/data/session";
import { C, privacySummary } from "@/domain/copy.js";
import { PasswordForm } from "./PasswordForm";
import { PrivacyContent } from "./PrivacyScreen";
import { useScreen } from "./useScreen";

export function Onboarding() {
  const { people } = useData(), them = people.names[people.them];
  const [step, setStep] = useState<"privacy" | "password">("privacy"), h1 = useRef<HTMLHeadingElement>(null);
  const title = step === "privacy" ? C.obPrivacyTitle : C.pwTitle;
  useScreen(title, h1, true);
  const finish = async (saved: boolean) => { await markOnboarded(people.me); if (saved) toast.success(C.pwSaved); };
  return (
    <main id="onboarding" className="mx-auto flex max-w-xl flex-col gap-5 px-5 pb-10 pt-[calc(env(safe-area-inset-top)+40px)]">
      <h1 id="screen-title" ref={h1} tabIndex={-1} className="text-title outline-none">{title}</h1>
      {step === "privacy" ? (<>
        <ul id="ob-points" className="flex list-disc flex-col gap-2 pl-5 text-body">{privacySummary(them).map((t) => <li key={t}>{t}</li>)}</ul>
        <details className="group rounded-xl border bg-card">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-3 text-body font-medium [&::-webkit-details-marker]:hidden">
            <ChevronRight className="size-4 shrink-0 transition-transform group-open:rotate-90" aria-hidden="true" />{C.obMore}
          </summary>
          <div className="px-4 pb-4"><PrivacyContent them={them} /></div>
        </details>
        <Button size="lg" className="h-11" data-act="ob-continue" onClick={() => setStep("password")}>{C.obContinue}</Button>
      </>) : (
        <PasswordForm them={them} onDone={() => void finish(true)} onSkip={() => void finish(false)} />
      )}
    </main>
  );
}
