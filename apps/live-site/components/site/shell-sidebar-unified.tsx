'use client'

import { useEffect, useState, type MouseEvent } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Skeleton } from '@/components/ui/skeleton'
import { DAILY_RACE_STATUS, formatRaceCountdown } from '@/lib/lumen/daily-races'
import { useShell } from './shell-context'
import { ShellIcon } from './shell-icons'
import { gameForNavAction } from './shell-nav-launch'
import {
  PRODUCT_SWITCH,
  UNIFIED_GROUPS,
  UNIFIED_QUICK_LINKS,
  UNIFIED_UTILITIES,
  groupForPath,
  switchProductForPath,
  unifiedItemActive,
  type UnifiedGroupId,
  type UnifiedNavItem,
} from './shell-nav-unified'
import { useShellNavVariant } from './shell-nav-variant'
import { cn } from '@/lib/utils'

/* Row recipe — same geometry as shell-sidebar NavItem (h-11 · rounded-lg · px-2 · gap-2). */
const ROW =
  'group relative flex w-full items-center gap-2 rounded-lg border-0 bg-transparent px-2 text-left text-sm leading-5 outline-none transition-colors duration-200 ease-in-out focus-visible:ring-2 focus-visible:ring-ring'
const ROW_IDLE =
  'font-medium text-muted-foreground-inverted hover:bg-surface-muted-1-inverted hover:text-foreground-inverted'
const ROW_ACTIVE = 'bg-sidebar-primary font-semibold text-sidebar-primary-foreground'

/** Shared navigation for the unified tree — prototype in-place nav or real soft-nav. */
function useUnifiedNav(onDone?: () => void) {
  const pathname = usePathname()
  const nav = useShellNavVariant()
  const shell = useShell()
  const path = nav.path ?? pathname

  const go = (href: string, event?: MouseEvent) => {
    if (nav.navigate) {
      event?.preventDefault()
      nav.navigate(href)
    } else {
      shell.startNavigating(href)
    }
    onDone?.()
  }

  const runItem = (item: UnifiedNavItem, event: MouseEvent) => {
    if (item.game) {
      event.preventDefault()
      shell.launchGame(item.game, event.currentTarget as HTMLElement)
      onDone?.()
      return true
    }
    if (item.action === 'open-vip-hub') {
      event.preventDefault()
      shell.setVipHubOpen(true)
      onDone?.()
      return true
    }
    if (item.action === 'open-intercom') {
      event.preventDefault()
      shell.setIntercomOpen(true)
      onDone?.()
      return true
    }
    if (item.action === 'launch-last-game') {
      event.preventDefault()
      onDone?.()
      if (!shell.loggedIn) {
        shell.openAuth('login')
        return true
      }
      if (shell.lastPlayedGame) shell.launchGame(shell.lastPlayedGame)
      return true
    }
    if (item.action === 'launch-random') {
      event.preventDefault()
      shell.launchGame(gameForNavAction('launch-random'))
      onDone?.()
      return true
    }
    if (item.href.startsWith('#')) {
      event.preventDefault()
      return true
    }
    return false
  }

  return { path, go, runItem, shell }
}

/** Casino | Sports — Lumen segmented control on sidebar tokens. */
export function SidebarProductSwitch({
  expanded,
  onDone,
}: {
  expanded: boolean
  onDone?: () => void
}) {
  const { path, go } = useUnifiedNav(onDone)
  const current = switchProductForPath(path)

  return (
    <div
      role="tablist"
      aria-label="Product"
      data-name="sidebar-product-switch"
      className={cn(
        'grid w-full gap-1 rounded-lg bg-surface-muted-1-inverted p-1',
        expanded ? 'grid-cols-2' : 'grid-cols-1',
      )}
    >
      {PRODUCT_SWITCH.map((item) => {
        const active = current === item.id
        return (
          <Link
            key={item.id}
            href={item.href}
            role="tab"
            aria-selected={active}
            aria-label={item.label}
            data-state={active ? 'active' : 'default'}
            data-tip={expanded ? undefined : item.label}
            data-tip-side="right"
            onClick={(event) => {
              if (active) {
                event.preventDefault()
                return
              }
              go(item.href, event)
            }}
            className={cn(
              'flex h-9 items-center justify-center gap-1.5 rounded-md text-sm font-semibold transition-colors duration-200 ease-in-out',
              active
                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                : 'text-muted-foreground-inverted hover:bg-surface-muted-1-inverted hover:text-foreground-inverted',
            )}
          >
            <ShellIcon name={item.icon} tone="token" className="size-4" />
            {expanded ? <span>{item.label}</span> : null}
          </Link>
        )
      })}
    </div>
  )
}

/** $25k Daily Race — pot + live countdown. Prototype lane only (Races not merged). */
export function SidebarRaceWidget({
  expanded,
  onDone,
}: {
  expanded: boolean
  onDone?: () => void
}) {
  const { go, shell } = useUnifiedNav(onDone)
  const [mounted, setMounted] = useState(false)
  const [remaining, setRemaining] = useState(DAILY_RACE_STATUS.endsInSeconds)

  useEffect(() => {
    setMounted(true)
    const id = window.setInterval(() => {
      setRemaining((s) => (s <= 1 ? DAILY_RACE_STATUS.endsInSeconds : s - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [])

  if (!mounted) {
    return expanded ? (
      <Skeleton className="h-20 w-full rounded-lg bg-surface-muted-1-inverted" />
    ) : (
      <Skeleton className="mx-auto size-10 rounded-md bg-surface-muted-1-inverted" />
    )
  }

  if (!expanded) {
    return (
      <Link
        href="/promotions/races"
        aria-label="$25k Daily Race"
        data-tip="$25k Daily Race"
        data-tip-side="right"
        onClick={(event) => go('/promotions/races', event)}
        className="relative mx-auto flex size-10 items-center justify-center rounded-md text-muted-foreground-inverted transition-colors duration-200 ease-in-out hover:bg-surface-muted-1-inverted hover:text-foreground-inverted"
      >
        <ShellIcon name="trophy" tone="token" className="size-5" />
        <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary motion-safe:animate-pulse" aria-hidden />
      </Link>
    )
  }

  return (
    <div
      data-name="sidebar-race-widget"
      className="flex flex-col gap-2 rounded-lg border border-border-inverted bg-surface-muted-1-inverted p-3"
    >
      <Link
        href="/promotions/races"
        onClick={(event) => go('/promotions/races', event)}
        className="group flex items-center gap-2"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-muted-1-inverted text-foreground-inverted">
          <ShellIcon name="trophy" tone="token" className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold leading-5 text-foreground-inverted">
            $25k Daily Race
          </span>
          <span className="block text-xs leading-4 text-muted-foreground-inverted">
            Resets daily · paid in cash
          </span>
        </span>
        <ShellIcon
          name="caretDown"
          tone="token"
          className="size-3 -rotate-90 text-muted-foreground-inverted transition-colors group-hover:text-foreground-inverted"
        />
      </Link>
      <div className="flex items-center justify-between gap-2 rounded-md bg-surface-muted-1-inverted px-2 py-1.5">
        <span className="text-xs font-medium text-muted-foreground-inverted">Ends in</span>
        <span className="text-xs font-bold tabular-nums text-foreground-inverted" aria-live="off">
          {formatRaceCountdown(remaining)}
        </span>
      </div>
      {shell.loggedIn ? (
        <p className="text-xs leading-4 text-muted-foreground-inverted">
          You&rsquo;re <span className="font-semibold text-foreground-inverted">{DAILY_RACE_STATUS.position}</span> · keep playing to climb
        </p>
      ) : (
        <button
          type="button"
          onClick={() => {
            shell.openAuth('login')
            onDone?.()
          }}
          className="h-8 rounded-md bg-primary text-xs font-semibold text-primary-foreground transition-opacity duration-150 hover:opacity-90"
        >
          Log in to join
        </button>
      )}
    </div>
  )
}

function ItemIcon({ item, active, size }: { item: UnifiedNavItem; active: boolean; size: 'box' | 'child' }) {
  if (item.iconSrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.iconSrc}
        alt=""
        className={cn(
          'shrink-0 rounded-md object-cover object-top',
          size === 'box' ? 'size-8' : 'size-6',
        )}
      />
    )
  }
  if (!item.icon) return size === 'box' ? <span className="size-8 shrink-0" aria-hidden /> : null
  if (size === 'child') {
    return <ShellIcon name={item.icon} tone="token" className="size-4 shrink-0" />
  }
  return (
    <span
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-md transition-colors duration-200 ease-in-out',
        active ? 'bg-sidebar-primary' : 'bg-surface-muted-1-inverted',
      )}
    >
      <ShellIcon name={item.icon} tone="token" className="size-5" />
    </span>
  )
}

function UnifiedRow({
  item,
  expanded,
  child = false,
  onDone,
}: {
  item: UnifiedNavItem
  expanded: boolean
  child?: boolean
  onDone?: () => void
}) {
  const { path, go, runItem, shell } = useUnifiedNav(onDone)
  const active = unifiedItemActive(item, path)

  let subtitle = item.subtitle
  let iconItem = item
  if (item.action === 'launch-last-game') {
    if (shell.loggedIn && shell.lastPlayedGame) {
      subtitle = shell.lastPlayedGame.title
      iconItem = { ...item, iconSrc: shell.lastPlayedGame.imageSrc }
    } else if (shell.loggedIn) {
      subtitle = 'Will show here'
    }
  }

  if (!expanded && !item.icon && !item.iconSrc) return null

  return (
    <Link
      href={item.href}
      aria-label={item.label}
      aria-current={active ? 'page' : undefined}
      data-state={active ? 'active' : 'default'}
      data-tip={expanded ? undefined : item.label}
      data-tip-side="right"
      onClick={(event) => {
        if (runItem(item, event)) return
        go(item.href, event)
      }}
      className={cn(
        ROW,
        child ? 'h-9' : expanded ? 'h-11' : 'h-12 justify-center px-0',
        active ? ROW_ACTIVE : ROW_IDLE,
        !expanded && active && 'bg-transparent',
      )}
    >
      <ItemIcon item={iconItem} active={active} size={child ? 'child' : 'box'} />
      {expanded ? (
        <>
          <span className="min-w-0 flex-1">
            <span className="block truncate">{item.label}</span>
            {subtitle ? (
              <span className="block truncate text-xs font-normal leading-4 opacity-80">{subtitle}</span>
            ) : null}
          </span>
          {item.live ? (
            <span className="relative mr-0.5 flex size-2 shrink-0" aria-hidden>
              <span className="absolute inline-flex size-full rounded-full bg-primary opacity-60 motion-safe:animate-ping" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
          ) : null}
          {item.trailing ? (
            <ShellIcon name={item.trailing} tone="token" className="size-4 shrink-0" />
          ) : null}
        </>
      ) : null}
    </Link>
  )
}

/**
 * Unified tree body — used by the desktop sidebar and the mobile drawer.
 * `expanded=false` = 96px rail (icons + tooltips).
 */
export function UnifiedNavTree({
  expanded,
  onDone,
  showSwitch = true,
}: {
  expanded: boolean
  onDone?: () => void
  showSwitch?: boolean
}) {
  const pathname = usePathname()
  const nav = useShellNavVariant()
  const { toggle } = useShell()
  const path = nav.path ?? pathname
  const openGroup = groupForPath(path)
  const [railOpenRequest, setRailOpenRequest] = useState<UnifiedGroupId | null>(null)
  /* A rail tap opens that group once; a route change hands control back to the path. */
  useEffect(() => {
    setRailOpenRequest(null)
  }, [path])
  const defaultGroup = railOpenRequest ?? openGroup ?? undefined

  return (
    <div className="flex flex-col gap-3">
      {showSwitch ? <SidebarProductSwitch expanded={expanded} onDone={onDone} /> : null}
      {nav.showRaceWidget ? <SidebarRaceWidget expanded={expanded} onDone={onDone} /> : null}

      <div className="flex flex-col gap-1">
        {UNIFIED_QUICK_LINKS.map((item) => (
          <UnifiedRow key={item.label} item={item} expanded={expanded} onDone={onDone} />
        ))}
      </div>

      <div className="h-px w-full bg-border-inverted" />

      {expanded ? (
        <Accordion key={defaultGroup ?? 'none'} type="multiple" defaultValue={defaultGroup}>
          <div className="flex flex-col gap-1">
            {UNIFIED_GROUPS.map((group) => (
              <AccordionItem key={group.id} value={group.id} className="border-0">
                <AccordionTrigger
                  value={group.id}
                  className={cn(
                    ROW,
                    ROW_IDLE,
                    'h-11 py-0 hover:no-underline [&>svg]:text-muted-foreground-inverted',
                  )}
                >
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-muted-1-inverted">
                      <ShellIcon name={group.icon} tone="token" className="size-5" />
                    </span>
                    <span className="truncate">{group.label}</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent value={group.id}>
                  <div className="ml-6 mt-1 flex flex-col gap-0.5 border-l border-border-inverted pl-2">
                    {group.items.map((item) => (
                      <UnifiedRow
                        key={`${group.id}-${item.label}`}
                        item={item}
                        expanded
                        child
                        onDone={onDone}
                      />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </div>
        </Accordion>
      ) : (
        <div className="flex flex-col gap-1">
          {UNIFIED_GROUPS.map((group) => {
            const active = openGroup === group.id
            return (
              <button
                key={group.id}
                type="button"
                aria-label={group.label}
                data-tip={group.label}
                data-tip-side="right"
                onClick={() => {
                  setRailOpenRequest(group.id)
                  toggle()
                }}
                className={cn(ROW, ROW_IDLE, 'h-12 justify-center px-0')}
              >
                <span
                  className={cn(
                    'flex size-10 items-center justify-center rounded-md transition-colors duration-200 ease-in-out',
                    active ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'group-hover:bg-surface-muted-1-inverted',
                  )}
                >
                  <ShellIcon name={group.icon} tone="token" className="size-5" />
                </span>
              </button>
            )
          })}
        </div>
      )}

      <div className="h-px w-full bg-border-inverted" />

      <div className="flex flex-col gap-1 pb-4">
        {UNIFIED_UTILITIES.map((item) => (
          <UnifiedRow key={item.label} item={item} expanded={expanded} onDone={onDone} />
        ))}
      </div>
    </div>
  )
}

/** Desktop sidebar — 96px rail ↔ 256px. Switch sits in the top slot, level with the header. */
export function ShellSidebarUnified() {
  const { expanded } = useShell()

  return (
    <aside
      data-name="sidebar-container"
      data-variant="unified"
      data-state={expanded ? 'expanded' : 'collapsed'}
      className={cn(
        'pointer-events-auto fixed inset-y-0 left-0 z-[80] hidden h-svh flex-col border-r border-border-inverted bg-sidebar transition-[width] duration-300 ease-in-out lg:flex',
        expanded ? 'w-64' : 'w-24',
      )}
    >
      <div
        className={cn(
          'flex shrink-0 items-center border-b border-border-inverted py-3',
          expanded ? 'px-2' : 'px-4',
        )}
      >
        <SidebarProductSwitch expanded={expanded} />
      </div>
      <nav
        aria-label="Site"
        className={cn(
          'shell-scroll flex-1 overflow-y-auto overflow-x-hidden pt-3 transition-[padding] duration-300 ease-in-out',
          expanded ? 'px-2' : 'px-4',
        )}
      >
        <UnifiedNavTree expanded={expanded} showSwitch={false} />
      </nav>
    </aside>
  )
}
