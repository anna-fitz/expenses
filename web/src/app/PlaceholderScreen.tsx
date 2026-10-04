import { useRef, type ReactNode } from "react";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { C } from "@/domain/copy.js";
import { useScreen } from "./useScreen";

export function PlaceholderScreen({ title, children }: { title: string; children?: ReactNode }) {
  const h1 = useRef<HTMLHeadingElement>(null);
  useScreen(title, h1);
  return (
    <div className="flex flex-col gap-6">
      <h1 id="screen-title" ref={h1} tabIndex={-1} className="text-title outline-none">{title}</h1>
      <Empty className="rounded-xl border border-dashed">
        <EmptyHeader><EmptyTitle>{C.soonTitle}</EmptyTitle><EmptyDescription>{C.soonBody}</EmptyDescription></EmptyHeader>
      </Empty>
      {children}
    </div>
  );
}
