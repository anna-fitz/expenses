import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { openSheet } from "@/app/route";
import { SecurityNote } from "@/app/SecurityNote";
import { Choice } from "@/components/Choice";
import { PersonAvatar } from "@/components/PersonAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/data/auth";
import { useData } from "@/data/data";
import { saveProfile } from "@/data/profile";
import { signOutAndErase } from "@/data/session";
import type { Profile, Theme } from "@/data/types";
import { C, COLOR_NAMES, colorMoved, theirColor, tooClose, venmoHelp, venmoPrivacy } from "@/domain/copy.js";
import { PERSON_COLORS, clashes, resolveColors, type ColorKey } from "@/domain/people";
import { isOneEmoji, normalizeVenmo } from "@/domain/profile";
import { cn } from "@/lib/utils";
import { SettingsPage } from "./SettingsPage";
import { usePending } from "./usePending";

const focusSoon = (id: string) => requestAnimationFrame(() => document.getElementById(id)?.focus());
const KEYS = Object.keys(PERSON_COLORS) as ColorKey[], NONE: Profile = {};

export function ProfilePage() {
  const { people, profiles: saved } = useData(), auth = useAuth(), { me, them, a, b, names } = people;
  const [p, pend] = usePending(saved[me] || NONE), profiles = { ...saved, [me]: p };
  const email = auth.status === "member" ? auth.user.email || "" : "";
  const [emoji, setEmoji] = useState(p.emoji || ""), [emojiErr, setEmojiErr] = useState(false);
  const [venmo, setVenmo] = useState(p.venmo || ""), [venmoErr, setVenmoErr] = useState(false);
  useEffect(() => { setEmoji(p.emoji || ""); }, [p.emoji]);   // saved here or on another phone
  useEffect(() => { setVenmo(p.venmo || ""); }, [p.venmo]);
  const colors = resolveColors(profiles, a, b), mine = colors[me], theirs = colors[them], vp = venmoPrivacy(names[them]);
  const saveEmoji = () => {
    if (!isOneEmoji(emoji)) { setEmojiErr(true); focusSoon("p-emoji"); return; }
    setEmojiErr(false); saveProfile(me, { emoji: emoji.trim() }); toast(C.emojiSaved);
  };
  const clearEmoji = () => { setEmoji(""); setEmojiErr(false); saveProfile(me, { emoji: null }); toast(C.emojiRemoved); };
  const saveVenmo = () => {
    const { value, ok } = normalizeVenmo(venmo);
    if (!ok) { setVenmoErr(true); focusSoon("p-venmo"); return; }
    setVenmoErr(false); setVenmo(value); saveProfile(me, { venmo: value || null }); toast(value ? C.venmoSaved : C.venmoRemoved);
  };
  const onEnter = (f: () => void) => (e: React.KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); f(); } };
  return (
    <SettingsPage title={C.profile} heading={names[me]} lead={<PersonAvatar who={me} size={64} />}>
      <section aria-labelledby="h-look" className="flex flex-col gap-4">
        <h2 id="h-look" className="text-heading">{C.yourLook}</h2>
        <div className="grid gap-2">
          <Label htmlFor="p-emoji">{C.emoji}</Label>
          <div className="flex gap-2">
            <Input id="p-emoji" className="h-11 text-body" value={emoji} autoComplete="off" spellCheck={false}
              aria-invalid={emojiErr || undefined} aria-describedby={emojiErr ? "p-emoji-help p-emoji-err" : "p-emoji-help"}
              onChange={(e) => { setEmoji(e.target.value); setEmojiErr(false); }} onKeyDown={onEnter(saveEmoji)} />
            <Button variant="outline" className="h-11 text-body" data-act="emoji-save" onClick={saveEmoji}>{C.save}</Button>
          </div>
          <p id="p-emoji-help" className="text-caption text-muted-foreground">{C.emojiHelp}</p>
          {emojiErr && <p id="p-emoji-err" role="alert" className="text-caption text-destructive">{C.oneEmoji}</p>}
          {p.emoji && <Button variant="link" className="h-11 self-start px-0 text-body" data-act="emoji-clear" onClick={clearEmoji}>{C.useInitial}</Button>}
        </div>
        <fieldset id="p-color-set" className="min-w-0">
          <legend className="mb-2 text-body font-medium">{C.color}</legend>
          <div className="grid grid-cols-2 gap-2">
            {KEYS.map((k) => {
              const taken = k === theirs, near = !taken && clashes(k, theirs), off = taken || near, [l, d] = PERSON_COLORS[k];
              return (
                <label key={k} className={cn("group relative flex min-h-14 items-center gap-3 rounded-[14px] border bg-card px-3 py-2",
                  "has-[:checked]:border-foreground has-[:checked]:ring-1 has-[:checked]:ring-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                  off && "opacity-60")}>
                  <input type="radio" name="p-color" value={k} checked={mine === k} disabled={off}
                    onChange={() => { pend({ color: k }); saveProfile(me, { color: k }); toast(C.colorSaved); }}
                    className="absolute inset-0 z-10 m-0 size-full cursor-pointer appearance-none rounded-[14px] opacity-0 disabled:cursor-not-allowed" />
                  <span aria-hidden="true" className="size-6 shrink-0 rounded-full bg-[var(--sw-l)] dark:bg-[var(--sw-d)]"
                    style={{ "--sw-l": l, "--sw-d": d } as React.CSSProperties} />
                  <span className="flex min-w-0 flex-col">
                    <span className="font-medium">{COLOR_NAMES[k]}</span>
                    {off && <span className="text-caption text-muted-foreground">{taken ? theirColor(names[them]) : tooClose(names[them])}</span>}
                  </span>
                  <Check className="ml-auto hidden size-4 shrink-0 group-has-[:checked]:block" aria-hidden="true" />
                </label>
              );
            })}
          </div>
          {colors.moved === me && <p id="p-color-moved" className="mt-2 text-caption text-muted-foreground">{colorMoved(names[them], COLOR_NAMES[mine])}</p>}
        </fieldset>
        <Choice<Theme> name="p-theme" legend={C.theme} value={p.theme || "system"} onChange={(v) => { pend({ theme: v }); saveProfile(me, { theme: v }); toast(C.themeSaved); }}
          options={[{ value: "system", label: C.themeSystem }, { value: "light", label: C.themeLight }, { value: "dark", label: C.themeDark }]} />
      </section>
      <section aria-labelledby="h-paid" className="flex flex-col gap-2">
        <h2 id="h-paid" className="text-heading">{C.gettingPaid}</h2>
        <Label htmlFor="p-venmo">{C.venmoLabel}</Label>
        <div className="flex gap-2">
          <Input id="p-venmo" className="h-11 text-body" value={venmo} autoComplete="off" autoCapitalize="none" spellCheck={false}
            aria-invalid={venmoErr || undefined} aria-describedby={venmoErr ? "p-venmo-help p-venmo-err" : "p-venmo-help"}
            onChange={(e) => { setVenmo(e.target.value); setVenmoErr(false); }} onKeyDown={onEnter(saveVenmo)} />
          <Button variant="outline" className="h-11 text-body" data-act="venmo-save" onClick={saveVenmo}>{C.save}</Button>
        </div>
        <p id="p-venmo-help" className="text-caption text-muted-foreground">{venmoHelp(names[them])}</p>
        {venmoErr && <p id="p-venmo-err" role="alert" className="text-caption text-destructive">{C.venmoInvalid}</p>}
        <SecurityNote id="p-venmo-note">{vp.before}<code className="rounded bg-muted px-1 font-mono">{vp.code}</code>{vp.after}</SecurityNote>
      </section>
      <section aria-labelledby="h-account" className="flex flex-col gap-3">
        <h2 id="h-account" className="text-heading">{C.account}</h2>
        <div>
          <p className="text-caption text-muted-foreground">{C.emailLabel}</p>
          <p id="p-email" className="font-medium break-all">{email}</p>
        </div>
        <SecurityNote>{C.emailNote}</SecurityNote>
        <Button variant="outline" size="lg" className="h-11 text-body" data-act="change-pw" onClick={() => openSheet("#/settings/profile/password")}>{C.changePw}</Button>
        <Button variant="outline" size="lg" className="h-11 text-body" data-act="signout" onClick={() => void signOutAndErase()}>{C.signOut}</Button>
        <SecurityNote id="signout-note">{C.signOutNote}</SecurityNote>
      </section>
    </SettingsPage>
  );
}
