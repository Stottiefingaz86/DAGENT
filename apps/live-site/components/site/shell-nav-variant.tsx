'use client'

import { createContext, useContext, type ReactNode } from 'react'

/**
 * Shell nav variant — prototype lane only until Chris says Merge.
 *
 * - `default`: demo shell (header product tabs + per-product sidebar).
 * - `unified`: job screenshot-1793961160095-0 — no header product links,
 *   Casino | Sports switch in the sidebar top slot, race widget, quick links,
 *   collapsible groups (Casino · Originals · Sports · Poker · Promotions).
 *
 * `path` / `navigate` let a prototype page simulate routes in place so the
 * preview never drops back onto demo chrome.
 */
export type ShellNavVariant = 'default' | 'unified'

type ShellNavVariantValue = {
  variant: ShellNavVariant
  /** Simulated route inside a prototype (null = use the real pathname). */
  path: string | null
  /** Prototype in-place navigation (null = real soft-nav). */
  navigate: ((href: string) => void) | null
  /** Show the race widget (prototype lane only — Races is not merged). */
  showRaceWidget: boolean
}

const ShellNavVariantContext = createContext<ShellNavVariantValue>({
  variant: 'default',
  path: null,
  navigate: null,
  showRaceWidget: false,
})

export function ShellNavVariantProvider({
  variant,
  path = null,
  navigate = null,
  showRaceWidget = false,
  children,
}: {
  variant: ShellNavVariant
  path?: string | null
  navigate?: ((href: string) => void) | null
  showRaceWidget?: boolean
  children: ReactNode
}) {
  return (
    <ShellNavVariantContext.Provider value={{ variant, path, navigate, showRaceWidget }}>
      {children}
    </ShellNavVariantContext.Provider>
  )
}

export function useShellNavVariant() {
  return useContext(ShellNavVariantContext)
}
