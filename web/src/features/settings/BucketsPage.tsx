import { useMemo } from "react";
import { toast } from "sonner";
import { Choice } from "@/components/Choice";
import { useData } from "@/data/data";
import { saveSettings } from "@/data/profile";
import { SORTED_CATEGORIES } from "@/domain/categories";
import { C } from "@/domain/copy.js";
import { bucketOf, type Mapped } from "@/domain/insights";
import { slug } from "@/domain/stores.js";
import { SettingsPage } from "./SettingsPage";
import { usePending } from "./usePending";

// Which categories count as a Need or a Want (bills are always their own group). Shared, not logged; the whole map is written each time.
export function BucketsPage() {
  const { people, settings } = useData();
  const source = useMemo(() => ({ buckets: settings.buckets || {} }), [settings.buckets]);
  const [s, pend] = usePending(source);
  const save = (cat: string, v: Mapped) => {
    const next = Object.fromEntries(SORTED_CATEGORIES.map((c) => [c, c === cat ? v : bucketOf(c, s.buckets)]));
    pend({ buckets: next }); saveSettings(people.me, { buckets: next }); toast(C.saved);
  };
  const opts: { value: Mapped; label: string }[] = [{ value: "need", label: C.need }, { value: "want", label: C.want }];
  return (
    <SettingsPage title={C.bucketsTitle}>
      <p className="text-caption text-muted-foreground">{C.bucketsHelp}</p>
      {SORTED_CATEGORIES.map((c) => (
        <Choice<Mapped> key={c} name={`bk-${slug(c)}`} legend={c} value={bucketOf(c, s.buckets)} columns={2} options={opts} onChange={(v) => save(c, v)} />
      ))}
    </SettingsPage>
  );
}
