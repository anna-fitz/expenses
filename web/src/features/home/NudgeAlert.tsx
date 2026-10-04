import { TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useData } from "@/data/data";
import { C } from "@/domain/copy.js";
import { nudgeText } from "@/domain/money";

export function NudgeAlert() {
  const { people, expenses, settlements, settings } = useData(), text = nudgeText(expenses, settlements, settings, people.a, people.b);
  if (!text) return null;
  return (
    <Alert id="nudge" className="rounded-xl border-warning-border bg-warning-bg text-warning-fg">
      <TriangleAlert className="text-warning-icon" aria-hidden="true" />
      <AlertTitle>{C.nudgeTitle}</AlertTitle>
      <AlertDescription className="text-warning-fg"><p>{text}</p></AlertDescription>
    </Alert>
  );
}
