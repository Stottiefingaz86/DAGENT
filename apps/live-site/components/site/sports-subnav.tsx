'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useShellNavPath } from '@/components/site/shell-nav-path'
import {
  IconBallAmericanFootball,
  IconBallBaseball,
  IconBallBasketball,
  IconBallFootball,
  IconBallTennis,
  IconKarate,
  IconSnowflake,
  IconTicket,
  type Icon,
} from '@tabler/icons-react'
import { useShell } from '@/components/site/shell-context'
import {
  SOCCER_SPORT_RAIL,
  type SoccerRailIcon,
} from '@/lib/lumen/soccer-sport'
import { cn } from '@/lib/utils'

const RAIL_ICONS: Record<SoccerRailIcon, Icon> = {
  bets: IconTicket,
  soccer: IconBallFootball,
  football: IconBallAmericanFootball,
  basketball: IconBallBasketball,
  tennis: IconBallTennis,
  baseball: IconBallBaseball,
  hockey: IconSnowflake,
  mma: IconKarate,
}

const TILE_NAV_MS = 280

function activeRailId(pathname: string | null): string {
  if (!pathname) return 'soccer'
  if (pathname.startsWith('/sports/soccer')) return 'soccer'
  if (pathname === '/sports' || pathname === '/sports/') return 'soccer'
  return 'soccer'
}

/**
 * PropShopX sport icon rail — lives in shell sticky chrome with casino glass.
 * Scrolls horizontally on mobile (carousel); frosts content underneath.
 */
export function SportsSubNav() {
  const pathname = useShellNavPath()
  const router = useRouter()
  const { startNavigating } = useShell()
  const [railLoading, setRailLoading] = useState<string | null>(null)
  const active = activeRailId(pathname)

  const onRailClick = (item: (typeof SOCCER_SPORT_RAIL)[number]) => {
    if (item.id === active && pathname.startsWith(item.href)) return
    setRailLoading(item.id)
    window.setTimeout(() => {
      startNavigating(item.href)
      router.push(item.href)
      setRailLoading(null)
    }, TILE_NAV_MS)
  }

  return (
    <div
      data-name="sub-menu"
      data-glass="true"
      data-sticky="false"
      className="w-full shrink-0 border-b border-border"
    >
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center md:h-[76px] md:px-6 md:py-3">
        <nav
          data-name="sub-menu-scroll"
          aria-label="Sports"
          className="scrollbar-hide flex w-full min-w-0 gap-0.5 overflow-x-auto px-4 md:gap-1 md:px-0"
        >
          {SOCCER_SPORT_RAIL.map((item) => {
            const on = item.id === active
            const loading = railLoading === item.id
            const RailIcon = RAIL_ICONS[item.icon]
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onRailClick(item)}
                aria-current={on ? 'page' : undefined}
                className={cn(
                  'relative flex h-14 w-[68px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-lg px-1 transition-colors',
                  on
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                {loading ? (
                  <span className="size-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                ) : (
                  <RailIcon className="size-5" stroke={1.5} />
                )}
                <span className="text-[11px] font-medium leading-none tracking-tight">
                  {item.label}
                </span>
                {on ? (
                  <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-primary" />
                ) : null}
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
