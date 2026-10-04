import { useEffect, useState, type FormEvent } from "react";
import { sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth } from "@/data/firebase";
import { C, SIGNIN_NOTE } from "@/domain/copy.js";
import { SecurityNote } from "./SecurityNote";

// Pre-sign-in: no personal data, and no message reveals whether an email is registered.
export function LoginScreen() {
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => { document.title = "Sign in · Expenses"; }, []);
  const inv = err ? { "aria-describedby": "l-err", "aria-invalid": true as const } : {};
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget), em = String(f.get("email") || "").trim(), pw = String(f.get("password") || "");
    if (!em || !pw) return setErr(C.loginEmpty);
    setBusy(true); setErr("");
    try { await signInWithEmailAndPassword(auth, em, pw); }
    catch (x) {
      const code = (x as { code?: string }).code;
      setErr(code === "auth/too-many-requests" ? C.loginMany : code === "auth/network-request-failed" ? C.loginOffline : C.loginMismatch);
      setBusy(false);
    }
  }
  function forgot() {
    const em = (document.getElementById("l-email") as HTMLInputElement).value.trim();
    if (!em) return setErr(C.forgotNeedEmail);
    const done = () => { toast(C.resetMaybe); };   // same message either way: never reveals whether the account exists
    sendPasswordResetEmail(auth, em).then(done, done);
  }
  return (
    <main className="mx-auto max-w-sm px-5 pt-[12vh]">
      <form id="login-form" noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <h1 className="text-title">{C.appName}</h1>
        <p className="-mt-2 text-muted-foreground">{C.loginHelp}</p>
        <div className="grid gap-2"><Label htmlFor="l-email">{C.email}</Label>
          <Input id="l-email" name="email" type="email" autoComplete="username" inputMode="email" autoCapitalize="none" className="h-11 text-body" {...inv} /></div>
        <div className="grid gap-2"><Label htmlFor="l-pass">{C.password}</Label>
          <Input id="l-pass" name="password" type="password" autoComplete="current-password" className="h-11 text-body" {...inv} /></div>
        {err && <p id="l-err" role="alert" className="text-caption text-destructive">{err}</p>}
        <Button id="l-btn" type="submit" size="lg" className="h-11" disabled={busy}>{busy ? C.signingIn : C.signIn}</Button>
        <Button type="button" variant="link" data-act="forgot" onClick={forgot}>{C.forgot}</Button>
        <SecurityNote id="signin-note">{SIGNIN_NOTE}</SecurityNote>
      </form>
    </main>
  );
}
