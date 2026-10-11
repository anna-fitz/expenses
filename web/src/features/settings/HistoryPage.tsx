import { useState, type ChangeEvent } from "react";
import { collection, doc, getDocs, limit, orderBy, query, setDoc } from "firebase/firestore";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { db } from "@/data/firebase";
import { writeFailed } from "@/data/writes";
import { C, historyDropped, historyFound, historyHas, historyOneOffs } from "@/domain/copy.js";
import { buildHistory, type Preview } from "@/domain/historyImport";
import { shiftMonth } from "@/domain/insights";
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

// Brings the old settle-up spreadsheet into Insights as the pre-app monthly summary (config/history). Read on this phone; only totals are saved.
export function HistoryPage() {
  const history = useHistory();
  const [state, setState] = useState<"idle" | "reading" | "bad">("idle"), [preview, setPreview] = useState<Preview | null>(null);
  async function pick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setState("reading"); setPreview(null);
    try {
      const p = buildHistory(await readXlsx(new Uint8Array(await file.arrayBuffer()), inflate), await appStart());
      if (!p.first) throw new Error("no expenses found");
      setPreview(p); setState("idle");
    } catch (x) { console.warn(x); setState("bad"); }
  }
  function save() {
    if (!preview) return;
    setDoc(doc(db, "config", "history"), preview.history).catch(writeFailed);
    setPreview(null);
    toast(C.historySaved);
  }
  const has = history && Object.keys(history.months).length ? Object.keys(history.months).sort() : null;
  return (
    <SettingsPage title={C.historyTitle}>
      <p id="hi-now" className="text-body">{has ? historyHas(has[0], history!.through) : C.historyNone}</p>
      {preview ? (
        <section id="hi-preview" aria-live="polite" className="flex flex-col gap-3 rounded-xl border bg-card p-4">
          <p className="text-body">{historyFound(preview.items - preview.skipped - preview.dropped, preview.tabs, preview.first, preview.through, preview.totalCents)}</p>
          {preview.oneOffs > 0 && <p className="text-caption text-muted-foreground">{historyOneOffs(preview.oneOffs)}</p>}
          {preview.dropped > 0 && <p className="text-caption text-muted-foreground">{historyDropped(preview.dropped, shiftMonth(preview.through, 1))}</p>}
          <p className="text-caption text-muted-foreground">{C.historyKeeps}</p>
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
