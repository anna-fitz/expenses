import { ChevronRight } from "lucide-react";
import { openSheet } from "@/app/route";
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
          <button type="button" data-act="detail" data-id={s.id} onClick={() => openSheet(`#/history/settle/${encodeURIComponent(s.id)}`)}
            className="flex min-h-15 w-full items-center gap-3 px-4 py-3 text-left outline-offset-[-2px] active:bg-muted">
            <span className="min-w-0 flex-1">
              <span className="t block font-medium">{settleLine(s, people.names)}</span>
              <span className="s block text-caption text-muted-foreground">{settleSub(s)}</span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}
