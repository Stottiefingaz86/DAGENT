'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { productFromPath, type ShellProduct } from './shell-nav'

/**
 * Prototype lane only: lets a /prototype/<slug> draft render the shell as if it
 * were on a real product route (sidebar, sub-nav, dock pick their section from it).
 * No provider = the real pathname, so live routes behave exactly as before.
 */
const ShellNavPathContext = createContext<string | null>(null)

export function ShellNavPathProvider({ path, children }: { path: string; children: ReactNode }) {
  return <ShellNavPathContext.Provider value={path}>{children}</ShellNavPathContext.Provider>
}

/** Product for nav chrome: the override's product when a prototype sets one, else the shell's. */
export function useShellNavProduct(product: ShellProduct): ShellProduct {
  const override = useContext(ShellNavPathContext)
  return override ? productFromPath(override) : product
}

export function useShellNavPath(): string {
  const pathname = usePathname()
  const override = useContext(ShellNavPathContext)
  return override ?? pathname ?? '/'
}
