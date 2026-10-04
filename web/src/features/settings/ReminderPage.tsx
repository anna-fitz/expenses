import { toast } from "sonner";
import { Choice } from "@/components/Choice";
import { useData } from "@/data/data";
import { saveSettings } from "@/data/profile";
import { C, daysOpt, fmtWhole } from "@/domain/copy.js";
import { DEFAULT_SETTINGS, nudgeText } from "@/domain/money";
import { SettingsPage } from "./SettingsPage";
import { usePending } from "./usePending";

const DAYS = [0, 30, 60, 90], CENTS = [0, 25000, 50000, 100000];
// The shared settle-up reminder. A tap saves for both of you; the preview uses the Home card's own rule.
export function ReminderPage() {
  const { people, expenses, settlements, settings: saved } = useData(), [settings, pend] = usePending(saved), s = { ...DEFAULT_SETTINGS, ...settings };
  const save = (patch: { nudgeDays?: number; nudgeCents?: number }) => { pend(patch); saveSettings(people.me, patch); toast(C.reminderSaved); };
  const showing = !!nudgeText(expenses, settlements, settings, people.a, people.b);
  return (
    <SettingsPage title={C.reminderTitle}>
      <Choice name="r-days" legend={C.remindAfter} columns={2} value={String(s.nudgeDays)} onChange={(v) => save({ nudgeDays: Number(v) })}
        options={DAYS.map((d) => ({ value: String(d), label: d ? daysOpt(d) : C.off }))} />
      <Choice name="r-cents" legend={C.remindOver} columns={2} value={String(s.nudgeCents)} onChange={(v) => save({ nudgeCents: Number(v) })}
        options={CENTS.map((c) => ({ value: String(c), label: c ? fmtWhole(c) : C.off }))} />
      <p className="text-caption text-muted-foreground">{C.reminderHelp}</p>
      <p id="r-preview" role="status" className="rounded-xl border bg-card p-4 text-body">{C[showing ? "reminderOn" : "reminderOff"]}</p>
    </SettingsPage>
  );
}
