import { useData } from "@/data/data";
import type { Person } from "@/data/types";

export function PersonAvatar({ who, size = 28 }: { who: Person; size?: number }) {
  const { people, profiles } = useData(), slot = who === people.a ? "a" : "b", emoji = profiles[who]?.emoji;
  return (
    <span aria-hidden="true" className="inline-grid shrink-0 place-items-center rounded-full font-medium leading-none"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.45), background: `var(--person-${slot})`, color: `var(--person-${slot}-ink)` }}>
      {emoji || (people.names[who] || "?")[0]}
    </span>
  );
}
