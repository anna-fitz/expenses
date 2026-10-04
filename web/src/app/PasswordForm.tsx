import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setPassword } from "@/data/session";
import { C, pwNote } from "@/domain/copy.js";
import { SecurityNote } from "./SecurityNote";

type Field = "pw-new" | "pw-confirm" | "pw-current";
export function PasswordForm({ them, onDone, onSkip }: { them: string; onDone: () => void; onSkip?: () => void }) {
  const [err, setErr] = useState<{ msg: string; field: Field } | null>(null), [show, setShow] = useState(false);
  const [needCurrent, setNeedCurrent] = useState(false), [busy, setBusy] = useState(false);
  const refs: Record<Field, React.RefObject<HTMLInputElement | null>> = { "pw-new": useRef(null), "pw-confirm": useRef(null), "pw-current": useRef(null) };
  const fail = (msg: string, field: Field) => { setErr({ msg, field }); setTimeout(() => refs[field].current?.focus()); };
  const inv = (f: Field) => (err?.field === f ? { "aria-invalid": true as const, "aria-describedby": "pw-err" } : {});
  async function save() {
    const pw = refs["pw-new"].current!.value, again = refs["pw-confirm"].current!.value, cur = refs["pw-current"].current?.value;
    if (pw.length < 12) return fail(C.pwShort, "pw-new");
    if (pw !== again) return fail(C.pwMismatch, "pw-confirm");
    setBusy(true); const r = await setPassword(pw, needCurrent ? cur : undefined); setBusy(false);
    if (r === "ok") return onDone();
    if (r === "needCurrent") { setNeedCurrent(true); setErr(null); setTimeout(() => refs["pw-current"].current?.focus()); return; }
    if (r === "wrongCurrent") return fail(C.pwWrongCurrent, "pw-current");
    fail(C.pwFailed, "pw-new");
  }
  const type = show ? "text" : "password";
  return (
    <form noValidate className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <p className="text-body text-muted-foreground">{C.pwHelp}</p>
      <div className="grid gap-2"><Label htmlFor="pw-new">{C.pwNew}</Label>
        <Input id="pw-new" ref={refs["pw-new"]} type={type} autoComplete="new-password" className="h-11 text-body" {...inv("pw-new")} /></div>
      <div className="grid gap-2"><Label htmlFor="pw-confirm">{C.pwConfirm}</Label>
        <Input id="pw-confirm" ref={refs["pw-confirm"]} type={type} autoComplete="new-password" className="h-11 text-body" {...inv("pw-confirm")} /></div>
      <div className="flex items-center gap-2"><Checkbox id="pw-show" checked={show} onCheckedChange={(v) => setShow(v === true)} /><Label htmlFor="pw-show">{C.pwShow}</Label></div>
      {needCurrent && (<>
        <p className="text-body">{C.pwNeedCurrent}</p>
        <div className="grid gap-2"><Label htmlFor="pw-current">{C.pwCurrent}</Label>
          <Input id="pw-current" ref={refs["pw-current"]} type="password" autoComplete="current-password" className="h-11 text-body" {...inv("pw-current")} /></div>
      </>)}
      {err && <p id="pw-err" role="alert" className="text-caption text-destructive">{err.msg}</p>}
      <SecurityNote>{pwNote(them)}</SecurityNote>
      <Button type="submit" size="lg" className="h-11" data-act="pw-save" disabled={busy}>{C.pwSave}</Button>
      {onSkip && <Button type="button" variant="ghost" size="lg" className="h-11" data-act="pw-skip" onClick={onSkip}>{C.pwSkip}</Button>}
    </form>
  );
}
