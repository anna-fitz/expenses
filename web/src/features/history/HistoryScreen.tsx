import { useRef } from "react";
import type { Route } from "@/app/route";
import { useScreen } from "@/app/useScreen";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { C } from "@/domain/copy.js";
import { ActivityFeed } from "./ActivityFeed";
import { SettleList } from "./SettleList";

// The tab lives in the address (replaced, not pushed), so Back leaves History instead of flipping tabs.
export function HistoryScreen({ route }: { route: Route }) {
  const h1 = useRef<HTMLHeadingElement>(null), tab = route.sub === "activity" ? "activity" : "settle";
  useScreen(C.tabHistory, h1);
  return (
    <div className="flex flex-col gap-4">
      <h1 id="screen-title" ref={h1} tabIndex={-1} className="text-title outline-none">{C.tabHistory}</h1>
      <Tabs value={tab} onValueChange={(v) => location.replace(v === "activity" ? "#/history/activity" : "#/history")} className="gap-4">
        <TabsList className="h-auto w-full p-1">
          <TabsTrigger value="settle" data-act="h-settle" className="min-h-11 text-body">{C.settleUps}</TabsTrigger>
          <TabsTrigger value="activity" data-act="h-activity" className="min-h-11 text-body">{C.activityTab}</TabsTrigger>
        </TabsList>
        <TabsContent value="settle"><SettleList /></TabsContent>
        <TabsContent value="activity"><ActivityFeed /></TabsContent>
      </Tabs>
    </div>
  );
}
