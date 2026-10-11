// Two person-colored segments with a 2px gap; the text label carries the meaning.
export function BalanceBar({ mineSlot, theirSlot, mine, theirs, label }:
  { mineSlot: "a" | "b"; theirSlot: "a" | "b"; mine: number; theirs: number; label: string }) {
  const tot = mine + theirs, pct = tot ? (mine / tot) * 100 : 50;
  return (
    <div role="img" aria-label={label} className="mt-3 flex h-1.5 gap-0.5">
      <span className="rounded-full" style={{ width: `${pct}%`, background: `var(--person-${mineSlot})` }} />
      <span className="rounded-full" style={{ width: `${100 - pct}%`, background: `var(--person-${theirSlot})` }} />
    </div>
  );
}
