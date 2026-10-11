import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { signOutAndErase } from "@/data/session";
import { C } from "@/domain/copy.js";

export function DeniedScreen() {
  useEffect(() => { document.title = "Not set up · Expenses"; }, []);
  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 px-5 pt-[12vh]">
      <h1 className="text-title">{C.deniedTitle}</h1>
      <p className="text-muted-foreground">{C.deniedBody}</p>
      <Button variant="outline" size="lg" className="h-11" data-act="signout" onClick={() => void signOutAndErase()}>{C.signOut}</Button>
    </main>
  );
}
