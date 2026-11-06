import { type ClassValue, clsx } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/* Same as lib/utils.ts: Lumen text-size-* is a font size, so tailwind-merge must not drop it. */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["size-xxs", "size-xs", "size-sm", "size-base", "size-lg", "size-xl", "size-2xl", "size-3xl", "size-4xl", "size-5xl", "size-6xl", "size-7xl"] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
