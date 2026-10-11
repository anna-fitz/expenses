import { useState, type ChangeEvent } from "react";
import { collection, doc, getDocs, limit, orderBy, query, writeBatch } from "firebase/firestore";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { useData } from "@/data/data";
import { db } from "@/data/firebase";
import { writeFailed } from "@/data/writes";
import type { People, Person } from "@/data/types";
import { C, fmt, historyDropped, historyFound, historyHas, historyOneOffs, monthLabel, settleUpsFound, settleUpsHas } from "@/domain/copy.js";
import { buildHistory, settleUpsOf, type OldSettleUp, type Preview } from "@/domain/historyImport";
import { monthOf, shiftMonth } from "@/domain/insights";
import { readXlsx } from "@/domain/xlsx";
import { useHistory } from "@/features/insights/useInsightsData";
import { SettingsPage } from "./SettingsPage";

const inflate = async (data: Uint8Array) =>
  new Uint8Array(await new Response(new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer());
// The earliest expense in the app, settled ones too: the summary stops the month before it.
async function appStart(): Promise<string | null> {
  try { const s = await getDocs(query(collection(db, "expenses"), orderBy("date"), limit(1))); return (s.docs[0]?.data().date as string) || null; }
  catch { return null; }
}
// The sheet names its two people Bre and Kyle. Guess which member is Bre from the names; the page lets you change it.
const guessBre = (p: People): Person => [p.a, p.b].find((id) => /^bre/i.test(p.names[id] || "")) || [p.a, p.b].find((id) => !/^kyle/i.test(p.names[id] || "")) || p.me;

// A settle-up from the sheet, in the app's own shape, marked as imported. Ids follow the sheet's order, so importing again replaces them.
function settlementDoc(s: OldSettleUp, bre: Person, kyle: Person, by: Person) {
  const id = (p: "bre" | "kyle") => (p === "bre" ? bre : kyle);
  return {
    date: s.date, createdAt: Date.parse(`${s.date}T12:00:00`), by, from: s.from ? id(s.from) : null, to: s.from ? id(s.from === "bre" ? "kyle" : "bre") : null,
    amountCents: s.amountCents, count: s.count, periodStart: s.periodStart, periodEnd: s.periodEnd,
    [`${bre}Half`]: s.paid.bre, [`${kyle}Half`]: s.paid.kyle, [`${bre}Full`]: 0, [`${kyle}Full`]: 0, imported: true,
  };
}

// Brings the old settle-up spreadsheet in: its monthly totals into Insights (config/history), and optionally its settle-ups into History.
// The file is read on this phone; only totals are saved.
export function HistoryPage() {
  const history = useHistory(), { people, settlements } = useData();
  const [state, setState] = useState<"idle" | "reading" | "bad">("idle"), [preview, setPreview] = useState<Preview | null>(null);
  const [ups, setUps] = useState<OldSettleUp[]>([]), [withUps, setWithUps] = useState(true), [bre, setBre] = useState<Person>(() => guessBre(people));
  async function pick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setState("reading"); setPreview(null);
    try {
      const sheets = await readXlsx(new Uint8Array(await file.arrayBuffer()), inflate), start = await appStart();
      const p = buildHistory(sheets, start);
      if (!p.first) throw new Error("no expenses found");
      // Settle-ups from before the app only, like the summary.
      setUps(settleUpsOf(sheets).filter((s) => !start || s.date < start));
      setPreview(p); setState("idle");
    } catch (x) { console.warn(x); setState("bad"); }
  }
  function save() {
    if (!preview) return;
    const kyle = bre === people.a ? people.b : people.a, b = writeBatch(db);
    b.set(doc(db, "config", "history"), preview.history);
    // Settle-ups can be added but never changed (security rules), so ones already imported are skipped; otherwise the whole save would be refused.
    const have = new Set(settlements.map((s) => s.id));
    if (withUps) ups.forEach((s, i) => { const id = `sheet-${String(i + 1).padStart(3, "0")}`; if (!have.has(id)) b.set(doc(db, "settlements", id), settlementDoc(s, bre, kyle, people.me)); });
    b.commit().catch(writeFailed);
    setPreview(null);
    toast(withUps && ups.length ? C.historyAndSettlesSaved : C.historySaved);
  }
  const has = history && Object.keys(history.months).length ? Object.keys(history.months).sort() : null;
  const imported = settlements.filter((s) => s.imported).length;
  const total = ups.reduce((n, s) => n + s.amountCents, 0);
  return (
    <SettingsPage title={C.historyTitle}>
      <p id="hi-now" className="text-body">{has ? historyHas(has[0], history!.through) : C.historyNone}</p>
      {imported > 0 && <p id="hi-settles" className="text-body">{settleUpsHas(imported)}</p>}
      {preview ? (
        <section id="hi-preview" aria-live="polite" className="flex flex-col gap-3 rounded-xl border bg-card p-4">
          <p className="text-body">{historyFound(preview.items - preview.skipped - preview.dropped, preview.tabs, preview.first, preview.through, preview.totalCents)}</p>
          {preview.oneOffs > 0 && <p className="text-caption text-muted-foreground">{historyOneOffs(preview.oneOffs)}</p>}
          {preview.dropped > 0 && <p className="text-caption text-muted-foreground">{historyDropped(preview.dropped, shiftMonth(preview.through, 1))}</p>}
          <p className="text-caption text-muted-foreground">{C.historyKeeps}</p>
          {ups.length > 0 && (
            <div className="flex flex-col gap-3 border-t pt-3">
              <div className="flex items-start gap-3">
                <Checkbox id="hi-ups" checked={withUps} onCheckedChange={(v) => setWithUps(v === true)} aria-describedby="hi-ups-help" className="mt-3" />
                <div className="flex-1">
                  <Label htmlFor="hi-ups" className="flex min-h-11 items-center">{C.settleUpsAdd}</Label>
                  <p id="hi-ups-help" className="text-caption text-muted-foreground">
                    {settleUpsFound(ups.length, monthLabel(monthOf(ups[0].date)), monthLabel(monthOf(ups[ups.length - 1].date)), fmt(total))}</p>
                </div>
              </div>
              {withUps && (
                <div className="grid gap-2"><Label htmlFor="hi-bre">{C.whoIsBre}</Label>
                  <NativeSelect id="hi-bre" className="h-11 text-body" value={bre} onChange={(e) => setBre(e.target.value)}>
                    {[people.a, people.b].map((id) => <option key={id} value={id}>{people.names[id]}</option>)}
                  </NativeSelect></div>
              )}
            </div>
          )}
          <Button size="lg" className="h-11 text-body" data-act="hi-save" onClick={save}>{has ? C.historyReplace : C.historySave}</Button>
          <Button variant="ghost" className="h-11 text-body" data-act="hi-cancel" onClick={() => setPreview(null)}>{C.historyCancel}</Button>
        </section>
      ) : (
        <div className="flex flex-col gap-2">
          <label htmlFor="hi-file" className="inline-flex h-11 cursor-pointer items-center justify-center rounded-md border bg-card px-4 text-body font-medium focus-within:outline-2">
            {state === "reading" ? C.historyReading : C.historyPick}
            <input id="hi-file" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only"
              aria-describedby={state === "bad" ? "hi-err" : undefined} disabled={state === "reading"} onChange={(e) => void pick(e)} />
          </label>
          {state === "bad" && <p id="hi-err" role="alert" className="text-caption text-destructive">{C.historyBad}</p>}
          <p className="text-caption text-muted-foreground">{C.historyKeeps}</p>
        </div>
      )}
    </SettingsPage>
  );
}
