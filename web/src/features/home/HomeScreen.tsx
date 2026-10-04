import { useRef } from "react";
import { useScreen } from "@/app/useScreen";
import { useData } from "@/data/data";
import { greeting } from "@/domain/copy.js";

export function HomeScreen() {
  const { people } = useData(), h1 = useRef<HTMLHeadingElement>(null);
  useScreen(null, h1);
  return <section className="hero"><h1 id="screen-title" ref={h1} tabIndex={-1} className="text-title outline-none">{greeting(people.names[people.me], new Date().getHours())}</h1></section>;
}
