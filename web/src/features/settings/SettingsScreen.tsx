import { useRef } from "react";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { SecurityNote } from "@/app/SecurityNote";
import { markNavigated, useScreen } from "@/app/useScreen";
import { PersonAvatar } from "@/components/PersonAvatar";
import { Button } from "@/components/ui/button";
import { useData } from "@/data/data";
import { signOutAndErase } from "@/data/session";
import { withoutBills } from "@/domain/bills";
import { C, billsCount, reminderSummary, storesCount } from "@/domain/copy.js";
import { DEFAULT_SETTINGS } from "@/domain/money";
import { pickerStores } from "@/domain/stores.js";

export function SettingsScreen() {
  const { people, merchants, bills, settings } = useData(), h1 = useRef<HTMLHeadingElement>(null);
  useScreen(C.tabSettings, h1);
  const s = { ...DEFAULT_SETTINGS, ...settings };
  const rows: [string, string, string][] = [
    ["stores", C.stores, storesCount(withoutBills(pickerStores(merchants, ""), bills).length)],
    ["bills", C.bills, billsCount(bills.filter((x) => x.active !== false).length)],
    ["reminder", C.reminderTitle, reminderSummary(s.nudgeDays, s.nudgeCents)],
    ["buckets", C.bucketsTitle, ""],
  ];
  return (
    <div className="flex flex-col gap-6">
      <h1 id="screen-title" ref={h1} tabIndex={-1} className="text-title outline-none">{C.tabSettings}</h1>
      <a href="#/settings/profile" data-act="profile" onClick={markNavigated} className="flex min-h-16 items-center gap-3 rounded-xl border bg-card px-4 py-3">
        <PersonAvatar who={people.me} size={40} />
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{people.names[people.me]}</span>
          <span className="block text-caption text-muted-foreground">{C.profileSub}</span>
        </span>
        <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
      </a>
      <section aria-labelledby="shared-h" className="flex flex-col gap-1.5">
        <h2 id="shared-h" className="text-label text-muted-foreground">{C.shared}</h2>
        <p id="shared-note" className="text-caption text-muted-foreground">{C.sharedNote}</p>
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {rows.map(([k, label, value]) => (
            <li key={k}>
              <a href={`#/settings/${k}`} data-act={k} onClick={markNavigated} className="flex min-h-14 items-center gap-3 px-4 py-3 outline-offset-[-2px]">
                <span className="flex-1 text-body">{label}</span>
                <span className="text-caption text-muted-foreground">{value}</span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </section>
      <a href="#/settings/privacy" data-act="privacy" onClick={markNavigated} className="flex min-h-12 items-center gap-3 rounded-xl border bg-card px-4 py-3">
        <ShieldCheck className="size-5 text-muted-foreground" aria-hidden="true" />
        <span className="flex-1 text-body">{C.privacyTitle}</span>
        <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
      </a>
      <div className="flex flex-col gap-2">
        <Button variant="outline" size="lg" className="h-11" data-act="signout" onClick={() => void signOutAndErase()}>{C.signOut}</Button>
        <SecurityNote id="signout-note">{C.signOutNote}</SecurityNote>
      </div>
    </div>
  );
}
