import { Check } from "lucide-react";

export type Opt<T extends string> = { value: T; label: string };
// An either/or choice: native radios in a fieldset with a visible legend (arrow keys, one tab stop).
// Each radio covers its whole segment, so the tap target is the segment. The check mark means selected is never color alone.
// Labels wrap rather than cut off; `columns` lets a longer set sit in rows (say 2×2) so each label reads in full on a small phone.
export function Choice<T extends string>({ name, legend, value, options, onChange, describedBy, columns = options.length }:
  { name: string; legend: string; value: T; options: Opt<T>[]; onChange: (v: T) => void; describedBy?: string; columns?: number }) {
  return (
    <fieldset id={`${name}-set`} aria-describedby={describedBy} className="min-w-0">
      <legend className="mb-2 text-body font-medium">{legend}</legend>
      <div className="grid gap-1 rounded-[14px] bg-muted p-1" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {options.map((o) => (
          <label key={o.value} className="group relative flex min-h-11 items-center justify-center gap-1.5 rounded-[10px] px-2 text-body has-[:checked]:bg-card has-[:checked]:font-medium has-[:checked]:shadow-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)}
              className="absolute inset-0 z-10 m-0 size-full cursor-pointer appearance-none rounded-[10px] opacity-0" />
            <Check className="hidden size-4 shrink-0 group-has-[:checked]:block" aria-hidden="true" />
            <span className="min-w-0 text-center">{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
