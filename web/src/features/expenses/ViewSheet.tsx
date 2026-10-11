import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { closeSheet, openSheet } from "@/app/route";
import { Sheet } from "@/components/Sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useData } from "@/data/data";
import { db } from "@/data/firebase";
import type { Expense } from "@/data/types";
import { billNamed } from "@/domain/bills";
import { C, fmt, iso, weekdayDate, loggedBy, onlyTheyCan, personName, settledOn, shortDate, timeOf, viewOwe, viewYouOwe } from "@/domain/copy.js";
import { canEdit, ownerOf } from "@/domain/expenses";
import { canonicalName } from "@/domain/stores.js";

// An expense, read-only: every field as a label and value, what it means for the balance, and who logged it.
// Opened for the other person's expenses on Home, and from History → Activity for anyone's (yours get an Edit button).
// Settled expenses aren't in the live list, so they're read once by id.
export function ViewSheet({ id, back }: { id: string; back: string }) {
  const { expenses, merchants, people, loaded, settlements, bills } = useData(), live = expenses.find((e) => e.id === id);
  const [fetched, setFetched] = useState<Expense | null | undefined>(undefined);
  useEffect(() => {
    if (live || !loaded) return;
    let on = true;
    getDoc(doc(db, "expenses", id)).then((s) => { if (on) setFetched(s.exists() ? ({ id: s.id, ...s.data() } as Expense) : null); }, () => { if (on) setFetched(null); });
    return () => { on = false; };
  }, [id, live, loaded]);
  const e = live || fetched, close = () => closeSheet(back);
  const name = (p: string) => personName(p, people.names, people.me);
  const them = people.names[people.them];
  let body;
  if (e === undefined) body = <Skeleton className="h-48 rounded-xl" />;
  else if (e === null) body = <p className="text-muted-foreground">{C.editGone}</p>;
  else {
    // What this expense moves on the balance: half for a 50/50 split, all of it when owed in full.
    const share = e.split === "full" ? e.amountCents : Math.round(e.amountCents / 2);
    const balance = e.payer === people.me ? viewOwe(fmt(share), them) : viewYouOwe(fmt(share), them);
    const rows: [string, string][] = [
      [C.paidByL, name(e.payer)],
      [C.splitL, `${e.split === "full" ? C.splitFull : C.splitHalf} · ${balance}`],
      [C.dateL, weekdayDate(e.date)],
      [C.categoryL, e.category || "Other"],
      ...(e.covers ? [[C.coversL, e.covers] as [string, string]] : []),
      ...(e.note ? [[C.noteL, e.note] as [string, string]] : []),
      ...(e.createdBy ? [[C.loggedByL, e.createdAt ? loggedBy(name(e.createdBy), shortDate(iso(new Date(e.createdAt))), timeOf(e.createdAt)) : name(e.createdBy)] as [string, string]] : []),
      [C.statusL, e.settled ? (() => { const s = settlements.find((x) => x.id === e.settlementId); return s ? settledOn(s.date) : C.settledWord; })() : C.notSettled],
    ];
    body = (
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <p id="v-store" className="text-heading">{canonicalName(merchants, e.merchant)}</p>
            <div className="flex flex-wrap gap-1.5">
              {(e.billId || billNamed(bills, e.merchant)) && <Badge variant="outline" className="rounded-full">{C.billTag}</Badge>}
              {e.oneOff && <Badge variant="outline" className="rounded-full">{C.oneOffTag}</Badge>}
            </div>
          </div>
          <p id="v-amount" className="text-display tabular-nums">{fmt(e.amountCents)}</p>
        </div>
        <dl id="v-fields" className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-3 gap-y-2.5 rounded-xl border bg-card p-4">
          {rows.map(([k, v]) => <div key={k} className="contents"><dt className="text-muted-foreground">{k}</dt><dd className="min-w-0 break-words">{v}</dd></div>)}
        </dl>
        {!canEdit(e, people.me) && <p id="v-readonly" className="rounded-xl bg-muted p-3 text-caption text-muted-foreground">{onlyTheyCan(people.names[ownerOf(e)] || C.someone)}</p>}
      </div>
    );
  }
  const editable = !!e && !e.settled && canEdit(e, people.me);
  return (
    <Sheet title={C.viewTitle} onClose={close}
      headerAction={<Button variant="ghost" className="h-11 text-body" data-act="close" onClick={close}>{C.done}</Button>}
      actions={editable ? <Button size="lg" className="h-13 flex-1 text-body" data-act="v-edit" onClick={() => openSheet(`#/edit/${encodeURIComponent(e!.id)}`)}>{C.edit}</Button> : undefined}>
      {body}
    </Sheet>
  );
}
