import { BalanceBar } from "@/components/BalanceBar";
import { PersonAvatar } from "@/components/PersonAvatar";
import { Card } from "@/components/ui/card";
import { useData } from "@/data/data";
import { balanceLine, daysBetween, fmt, sinceLine, todayISO } from "@/domain/copy.js";
import { calc } from "@/domain/money";

export function BalanceCard() {
  const { people, expenses, settlements } = useData(), { me, them, a, b, names } = people;
  const t = calc(expenses, a, b), bl = balanceLine(t.net, me, a, b, names), mine = t.paid[me], theirs = t.paid[them], last = settlements[0];
  const slot = (p: string) => (p === a ? "a" : "b") as "a" | "b";
  return (
    <Card className="hero gap-0 rounded-xl p-4 shadow-none" role="region" aria-label="Current balance">
      <p className="who text-caption text-muted-foreground">{bl.who}</p>
      <p className="amt text-display tabular-nums">{fmt(Math.abs(t.net))}</p>
      {bl.sub && <p className="sub text-caption text-muted-foreground">{bl.sub}</p>}
      <BalanceBar mineSlot={slot(me)} theirSlot={slot(them)} mine={mine} theirs={theirs} label={`You paid ${fmt(mine)}, ${names[them]} paid ${fmt(theirs)}`} />
      <div className="legend mt-2 flex justify-between gap-3 text-caption text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><PersonAvatar who={me} size={18} /><span>You paid <span className="tabular-nums">{fmt(mine)}</span></span></span>
        <span className="inline-flex items-center gap-1.5"><PersonAvatar who={them} size={18} /><span>{names[them]} paid <span className="tabular-nums">{fmt(theirs)}</span></span></span>
      </div>
      <p className="since mt-3 text-caption text-muted-foreground">{sinceLine(expenses.length, last ? last.date : null, last ? daysBetween(last.date, todayISO()) : 0)}</p>
    </Card>
  );
}
