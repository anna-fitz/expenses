import { useState } from "react";
import { Smartphone, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { C } from "@/domain/copy.js";

const KEY = "hideInstall";   // the live app's key: a phone that dismissed the hint there won't see it again
const installed = () => matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
const isApple = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const dismissed = () => { try { return localStorage.getItem(KEY) === "1"; } catch { return false; } };

// Until the app is installed (or the hint is dismissed on this phone), Home says how to add it to the Home Screen.
export function InstallHint() {
  const [hidden, setHidden] = useState(() => installed() || dismissed());
  if (hidden) return null;
  const dismiss = () => {
    try { localStorage.setItem(KEY, "1"); } catch { /* storage blocked: hide it for now */ }
    setHidden(true);
    document.getElementById("screen-title")?.focus();
  };
  return (
    <Alert id="install" role="region" aria-labelledby="install-title" className="relative rounded-xl pr-14">
      <Smartphone aria-hidden="true" />
      <AlertTitle id="install-title" className="line-clamp-none">{C.installTitle}</AlertTitle>
      <AlertDescription><p>{isApple() ? C.installIos : C.installOther}</p></AlertDescription>
      <Button variant="ghost" size="icon" className="absolute top-1 right-1 size-11" aria-label={C.dismiss} data-act="hide-install" onClick={dismiss}>
        <X className="size-5" aria-hidden="true" />
      </Button>
    </Alert>
  );
}
