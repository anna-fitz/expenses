import { ChevronRight } from "lucide-react";
import { openSheet } from "@/app/route";
import { Button } from "@/components/ui/button";
import { useData } from "@/data/data";
import type { Bill } from "@/data/types";
import { C, billSub, fmt } from "@/domain/copy.js";
import { SettingsPage } from "./SettingsPage";

export function BillsPage() {
  const { people, bills } = useData(), all = bills.slice().sort((x, y) => (x.order || 0) - (y.order || 0));
  const active = all.filter((b) => b.active !== false), retired = all.filter((b) => b.active === false);
  const who = (p: string) => (p === people.me ? C.you : people.names[p] || people.names[people.b]);
  const list = (id: string, rows: Bill[]) => (
    <ul id={id} className="divide-y overflow-hidden rounded-xl border bg-card">
      {rows.map((b) => (
        <li key={b.id}>
          <button type="button" data-act="bill-open" data-id={b.id} onClick={() => openSheet(`#/settings/bills/${encodeURIComponent(b.id)}`)}
            className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left outline-offset-[-2px] active:bg-muted">
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{b.name}</span>
              <span className="block text-caption text-muted-foreground">{billSub(fmt(b.usualCents || 0), who(b.payer))}</span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
  return (
    <SettingsPage title={C.bills}>
      <Button size="lg" className="h-11 text-body" data-act="bill-new" onClick={() => openSheet("#/settings/bills/new")}>{C.addBill}</Button>
      <section aria-labelledby="bl-active-h" className="flex flex-col gap-1.5">
        <h2 id="bl-active-h" className="text-label text-muted-foreground">{C.activeBills}</h2>
        {active.length ? list("bl-active", active) : <p className="text-muted-foreground">{C.noBills}</p>}
      </section>
      {retired.length > 0 && (
        <section aria-labelledby="bl-retired-h" className="flex flex-col gap-1.5">
          <h2 id="bl-retired-h" className="text-label text-muted-foreground">{C.retiredBills}</h2>
          {list("bl-retired", retired)}
        </section>
      )}
    </SettingsPage>
  );
}
