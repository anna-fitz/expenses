import { openSheet } from "@/app/route";
import { BalanceBar } from "@/components/BalanceBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useData } from "@/data/data";
import { C, balanceLine, daysBetween, fmt, paidSplit, sinceLine, sinceShort, todayISO } from "@/domain/copy.js";
import { calc, nudgeText } from "@/domain/money";

export function BalanceCard() {
  const { people, expenses, settlements, settings } = useData(), { me, them, a, b, names } = people;
  const t = calc(expenses, a, b), bl = balanceLine(t.net, me, a, b, names), mine = t.paid[me], theirs = t.paid[them], last = settlements[0];
  const slot = (p: string) => (p === a ? "a" : "b") as "a" | "b";
  return (
    <Card className="hero gap-0 rounded-xl p-4 shadow-none" role="region" aria-label="Current balance">
      <p className="who text-caption text-muted-foreground">{bl.who}</p>
      <p className="amt text-display tabular-nums">{fmt(Math.abs(t.net))}</p>
      {bl.sub && <p className="sub text-caption text-muted-foreground">{bl.sub}</p>}
      <BalanceBar mineSlot={slot(me)} theirSlot={slot(them)} mine={mine} theirs={theirs} label={`You paid ${fmt(mine)}, ${names[them]} paid ${fmt(theirs)}`} />
      <p className="since mt-3 text-caption text-muted-foreground">
        {expenses.length ? `${sinceShort(expenses.length, last ? last.date : null)} · ${paidSplit(fmt(mine), names[them], fmt(theirs))}` : sinceLine(0, last ? last.date : null, last ? daysBetween(last.date, todayISO()) : 0)}
      </p>
      {expenses.length > 0 && !nudgeText(expenses, settlements, settings, a, b) && (
        <Button variant="outline" size="lg" className="mt-4 h-11 w-full text-body" data-act="settle" onClick={() => openSheet("#/settle")}>{C.settleUp}</Button>
      )}
    </Card>
  );
}
