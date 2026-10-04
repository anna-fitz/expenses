import { ChartColumn, History, House, Settings } from "lucide-react";
import { C } from "@/domain/copy.js";
import { cn } from "@/lib/utils";
import type { Tab } from "./route";
import { markNavigated } from "./useScreen";

const TABS = [
  { id: "home", href: "#/", Icon: House, label: C.tabHome },
  { id: "history", href: "#/history", Icon: History, label: C.tabHistory },
  { id: "insights", href: "#/insights", Icon: ChartColumn, label: C.tabInsights },
  { id: "settings", href: "#/settings", Icon: Settings, label: C.tabSettings },
] as const;
export function TabBar({ tab }: { tab: Tab }) {
  return (
    <nav aria-label="Main" className="border-t bg-card pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto grid max-w-xl grid-cols-4">
        {TABS.map(({ id, href, Icon, label }) => (
          <li key={id}>
            <a href={href} data-act={`tab-${id}`} onClick={markNavigated} aria-current={tab === id ? "page" : undefined}
              className={cn("flex min-h-14 flex-col items-center justify-center gap-0.5 text-label outline-offset-[-2px]",
                tab === id ? "text-foreground" : "text-muted-foreground")}>
              <Icon className="size-5" aria-hidden="true" />{label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
