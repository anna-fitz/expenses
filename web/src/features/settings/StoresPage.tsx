import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { markNavigated } from "@/app/useScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useData } from "@/data/data";
import { restoreStore } from "@/data/lists";
import { withoutBills } from "@/domain/bills";
import { C, bringBackName, storeSub } from "@/domain/copy.js";
import { pickerStores, removedStores } from "@/domain/stores.js";
import { SettingsPage } from "./SettingsPage";

export function StoresPage() {
  const { people, merchants, bills } = useData(), [q, setQ] = useState("");
  const list = withoutBills(pickerStores(merchants, q), bills), removed = withoutBills(removedStores(merchants), bills);
  return (
    <SettingsPage title={C.stores}>
      <div className="grid gap-2">
        <Label htmlFor="st-q">{C.searchStores}</Label>
        <Input id="st-q" className="h-11 text-body" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {list.length ? (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {list.map((m) => (
            <li key={m.id}>
              <a href={`#/settings/stores/${encodeURIComponent(m.id)}`} data-act="store-open" data-id={m.id} onClick={markNavigated}
                className="flex min-h-14 items-center gap-3 px-4 py-3 outline-offset-[-2px]">
                <span className="min-w-0 flex-1">
                  <span className="t block font-medium">{m.name}</span>
                  {storeSub(m.category, m.alsoCalled) && <span className="s block text-caption text-muted-foreground">{storeSub(m.category, m.alsoCalled)}</span>}
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      ) : <p className="text-muted-foreground">{C.noStores}</p>}
      {removed.length > 0 && (
        <section aria-labelledby="st-removed-h" className="flex flex-col gap-1.5">
          <h2 id="st-removed-h" className="text-label text-muted-foreground">{C.removedStores}</h2>
          <ul id="st-removed" className="divide-y overflow-hidden rounded-xl border bg-card">
            {removed.map((m) => (
              <li key={m.id} className="flex min-h-14 items-center gap-3 px-4 py-2">
                <span className="flex-1">{m.name}</span>
                <Button variant="outline" className="h-11 text-body" data-act="store-restore" data-id={m.id} aria-label={bringBackName(m.name)}
                  onClick={() => { restoreStore(merchants, m.id, people.me); toast(C.storeBack); }}>{C.bringBack}</Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </SettingsPage>
  );
}
