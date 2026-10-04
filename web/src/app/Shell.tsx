import { useEffect } from "react";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useData } from "@/data/data";
import { signOutAndErase } from "@/data/session";
import { C } from "@/domain/copy.js";
import { PERSON_COLORS, inkOn, resolveColors } from "@/domain/people";
import { cn } from "@/lib/utils";
import { AddSheet } from "@/features/add/AddSheet";
import { EditSheet } from "@/features/expenses/EditSheet";
import { HistoryScreen } from "@/features/history/HistoryScreen";
import { HomeScreen } from "@/features/home/HomeScreen";
import { Onboarding } from "./Onboarding";
import { PlaceholderScreen } from "./PlaceholderScreen";
import { PrivacyScreen } from "./PrivacyScreen";
import { openSheet, useRoute } from "./route";
import { SecurityNote } from "./SecurityNote";
import { TabBar } from "./TabBar";
import { applyTheme } from "./theme";
import { markNavigated } from "./useScreen";

export function Shell() {
  const route = useRoute(), { people, profiles } = useData(), me = profiles[people.me];
  useEffect(() => { applyTheme(me?.theme); }, [me?.theme]);
  useEffect(() => {
    const r = resolveColors(profiles, people.a, people.b), s = document.documentElement.style;
    ([["a", people.a], ["b", people.b]] as const).forEach(([slot, id]) => {
      const [l, d] = PERSON_COLORS[r[id]];
      s.setProperty(`--person-${slot}-l`, l); s.setProperty(`--person-${slot}-d`, d);
      s.setProperty(`--person-${slot}-ink-l`, inkOn(l)); s.setProperty(`--person-${slot}-ink-d`, inkOn(d));
    });
  }, [profiles, people]);
  if (me === undefined) return null;          // profile not loaded yet (avoids flashing onboarding)
  if (!me.onboarded) return <Onboarding />;
  const them = people.names[people.them];
  const page = route.tab === "settings" && !!route.sub;   // a page inside a tab has a back link, so less room on top
  return (
    <div className="flex h-dvh flex-col">
      <main className={cn("flex-1 overflow-y-auto px-5 pb-6", page ? "pt-[calc(env(safe-area-inset-top)+16px)]" : "pt-[calc(env(safe-area-inset-top)+40px)]")}>
        <div className="mx-auto max-w-xl">
          {route.tab === "home" && <HomeScreen />}
          {route.tab === "history" && <HistoryScreen route={route} />}
          {route.tab === "insights" && <PlaceholderScreen title={C.tabInsights} />}
          {route.tab === "settings" && route.sub === "privacy" && <PrivacyScreen them={them} />}
          {route.tab === "settings" && route.sub !== "privacy" && (
            <PlaceholderScreen title={C.tabSettings}>
              <a href="#/settings/privacy" data-act="privacy" onClick={markNavigated}
                className="flex min-h-12 items-center gap-3 rounded-xl border bg-card px-4 py-3">
                <ShieldCheck className="size-5 text-muted-foreground" aria-hidden="true" />
                <span className="flex-1 text-body">{C.privacyTitle}</span>
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
              </a>
              <div className="flex flex-col gap-2">
                <Button variant="outline" size="lg" className="h-11" data-act="signout" onClick={() => void signOutAndErase()}>{C.signOut}</Button>
                <SecurityNote id="signout-note">{C.signOutNote}</SecurityNote>
              </div>
            </PlaceholderScreen>
          )}
        </div>
      </main>
      {route.tab === "home" && (
        <div className="px-5 pt-2 pb-3">
          <div className="mx-auto max-w-xl">
            <Button size="lg" className="h-13 w-full text-body" data-act="add" onClick={() => openSheet("#/add")}>{C.add}</Button>
          </div>
        </div>
      )}
      <TabBar tab={route.tab} />
      {route.sub === "add" && <AddSheet />}
      {route.sub === "edit" && route.id && <EditSheet key={route.id} id={route.id} />}
    </div>
  );
}
