import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// Teach tailwind-merge the design-language type scale, so `text-label` etc. count as sizes, not colors.
const twMerge = extendTailwindMerge({
  extend: { theme: { text: ["display", "title", "heading", "body", "caption", "label"] } },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
