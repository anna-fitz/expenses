import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { useData } from "@/data/data";
import { C, settleLine, settleSub } from "@/domain/copy.js";

export function SettleList() {
  const { settlements, people } = useData();
  if (!settlements.length) return (
    <Empty className="rounded-xl border border-dashed">
      <EmptyHeader><EmptyTitle>{C.noSettles}</EmptyTitle><EmptyDescription>{C.noSettlesBody}</EmptyDescription></EmptyHeader>
    </Empty>
  );
  return (
    <ul id="settle-list" className="divide-y overflow-hidden rounded-xl border bg-card">
      {settlements.map((s) => (
        <li key={s.id}>
          <div data-id={s.id} className="flex min-h-15 items-center gap-3 px-4 py-3">
            <span className="min-w-0 flex-1">
              <span className="t block font-medium">{settleLine(s, people.names)}</span>
              <span className="s block text-caption text-muted-foreground">{settleSub(s)}</span>
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
