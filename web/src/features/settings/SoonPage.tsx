import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { C } from "@/domain/copy.js";
import { SettingsPage } from "./SettingsPage";

// Stores and Bills arrive in part 5b; until then their rows lead here.
export function SoonPage({ title }: { title: string }) {
  return (
    <SettingsPage title={title}>
      <Empty className="rounded-xl border border-dashed">
        <EmptyHeader><EmptyTitle>{C.soonTitle}</EmptyTitle><EmptyDescription>{C.soonBody}</EmptyDescription></EmptyHeader>
      </Empty>
    </SettingsPage>
  );
}
