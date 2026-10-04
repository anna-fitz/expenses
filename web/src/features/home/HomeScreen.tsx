import { useEffect, useRef, useState } from "react";
import { useScreen } from "@/app/useScreen";
import { useData } from "@/data/data";
import { C, greeting } from "@/domain/copy.js";
import { BalanceCard } from "./BalanceCard";
import { ExpenseList } from "./ExpenseList";
import { NudgeAlert } from "./NudgeAlert";

export function HomeScreen() {
  const { people } = useData(), h1 = useRef<HTMLHeadingElement>(null), [online, setOnline] = useState(navigator.onLine);
  useScreen(null, h1);
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    addEventListener("online", on); addEventListener("offline", off);
    return () => { removeEventListener("online", on); removeEventListener("offline", off); };
  }, []);
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 id="screen-title" ref={h1} tabIndex={-1} className="text-title outline-none">{greeting(people.names[people.me], new Date().getHours())}</h1>
        {!online && <p id="sync" className="text-caption text-muted-foreground">{C.offline}</p>}
      </header>
      <BalanceCard />
      <NudgeAlert />
      <ExpenseList />
    </div>
  );
}
