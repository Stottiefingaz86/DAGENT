'use client'

/**
 * DRAFT — screenshot-1793980274344-0 "Casino expanding hover banners".
 * Desktop (md+): one accordion row, 240px tall; hover / focus expands a card, the rest collapse.
 * Mobile (< md): swipe-only rail, every card in its expanded layout (no tap-to-expand).
 * States for review via ?state=loading|error|single and ?open=<id> (simulates hover for screenshots).
 */

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ShellIcon } from '@/components/site/shell-icons'
import { useShell } from '@/components/site/shell-context'
import { CasinoLobby } from '@/components/lumen/casino-lobby-page'
import type { PromoLobbyBannerItem } from '@/components/lumen/casino-lobby-banners'
import { VipProgressBarFill, VipProgressCrown } from '@/components/lumen/vip-progress-crown'
import { useVipLevelUpCeremony } from '@/lib/lumen/use-vip-level-up-ceremony'
import { SILVER_LEVEL_UP_REWARD } from '@/lib/lumen/vip-hub'
import { CASINO_LOBBY_PROMO_BANNERS } from '@/lib/lumen/casino-lobby-promos'
import {
  DAILY_RACE_LEADERBOARD,
  DAILY_RACE_STATUS,
  formatRaceCountdown,
  formatRaceMoney,
} from '@/lib/lumen/daily-races'
import { cn } from '@/lib/utils'

export const EXPANDING_BANNERS_SLUG = 'screenshot-1793980274344-0'

const EASE ='ease-[cubic-bezier(0.22,1,0.36,1)]'
const LAUNCH_MS = 2200

type Slot = {
  id: string
  label: string
  onAction: () => void
  collapsed: ReactNode
  expanded: ReactNode
  art?: { src: string; className?: string; strong?: boolean }
  broken?: boolean
}

/* ── Card shell ─────────────────────────────────────────────── */

function AccordionCard({
  slot,
  open,
  onOpen,
  mobile,
}: {
  slot: Slot
  open: boolean
  onOpen: () => void
  mobile?: boolean
}) {
  const [loading, setLoading] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const launch = () => {
    if (loading) return
    setLoading(true)
    slot.onAction()
    timer.current = setTimeout(() => setLoading(false), LAUNCH_MS)
  }

  /* Art that fails to load falls back to the plain card surface (?state=error forces it). */
  const [imgFailed, setImgFailed] = useState(!!slot.broken)
  const showArt = !!slot.art && !imgFailed
  const expanded = mobile || open

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={slot.label}
      aria-expanded={mobile ? undefined : open}
      aria-busy={loading}
      data-open={expanded ? 'true' : 'false'}
      data-art={showArt ? 'on' : 'off'}
      onMouseEnter={mobile ? undefined : onOpen}
      onFocus={mobile ? undefined : onOpen}
      onClick={() => {
        /* Touch at md+: first tap opens, second tap runs the action. */
        if (!mobile && !open) return onOpen()
        launch()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          launch()
        }
      }}
      className={cn(
        'group relative cursor-pointer overflow-hidden rounded-lg border border-border bg-card shadow-none',
        'transition-[flex-grow,background-color,border-color] duration-300 motion-reduce:transition-none',
        EASE,
        'hover:border-foreground/15',
        'outline-none focus-visible:ring-2 focus-visible:ring-ring',
        mobile ? 'h-52 w-72 shrink-0' : 'h-60 min-w-0 basis-0',
        !mobile && (open ? 'grow-[3.4]' : 'grow'),
      )}
    >
      {showArt ? (
        <>
          <img
            src={slot.art!.src}
            alt=""
            onError={() => setImgFailed(true)}
            className={cn(
              'pointer-events-none absolute inset-0 size-full object-cover transition-transform duration-300 motion-reduce:transition-none',
              EASE,
              expanded ? 'object-right' : 'object-[70%_center] scale-[1.04]',
              expanded && slot.art!.className,
            )}
          />
          <div
            className={cn(
              'pointer-events-none absolute inset-0 transition-opacity duration-300',
              expanded
                ? slot.art!.strong || mobile
                  ? 'bg-gradient-to-r from-black from-35% via-black/80 via-55% to-transparent'
                  : 'bg-gradient-to-r from-black/80 via-black/45 to-transparent'
                : 'bg-gradient-to-b from-black/80 via-black/40 to-black/10',
            )}
          />
        </>
      ) : null}

      {loading ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/55 backdrop-blur-[1px]">
          <Loader2Icon className="size-8 animate-spin text-foreground" aria-hidden />
        </div>
      ) : null}

      {/* Collapsed layer */}
      <div
        aria-hidden={expanded}
        className={cn(
          'absolute inset-0 z-10 flex flex-col p-4 transition-opacity duration-200',
          expanded ? 'pointer-events-none opacity-0' : 'opacity-100 delay-75',
        )}
      >
        {slot.collapsed}
      </div>

      {/* Expanded layer — fixed width so copy never reflows mid-tween */}
      <div
        aria-hidden={!expanded}
        className={cn(
          'absolute inset-y-0 left-0 z-10 flex flex-col p-4 transition-opacity duration-200',
          /* min width while the card tweens open so copy never reflows; fills the card at rest */
          mobile ? 'w-full' : 'w-full min-w-sm',
          expanded ? 'opacity-100 delay-75' : 'pointer-events-none opacity-0',
        )}
      >
        {slot.expanded}
      </div>
    </article>
  )
}

/* ── Content blocks ─────────────────────────────────────────── */

/* Tones follow the card's data-art flag so a failed image flips copy to surface colours. */
const ON_ART = {
  tag: 'bg-white text-black group-data-[art=off]:bg-foreground group-data-[art=off]:text-background',
  title: 'text-white group-data-[art=off]:text-foreground',
  body: 'text-white/75 group-data-[art=off]:text-muted-foreground',
}

function Tag({ children }: { children: ReactNode }) {
  return (
    <span
      className={cn(
        'block w-fit max-w-full truncate rounded-full px-1.5 py-1 text-size-xxs font-medium leading-none',
        ON_ART.tag,
      )}
    >
      {children}
    </span>
  )
}

function promoSlot(p: PromoLobbyBannerItem, onAction: () => void, broken: boolean): Slot {
  return {
    id: p.id ?? p.title ?? 'promo',
    label: `${p.title} — ${p.buttonLabel}`,
    onAction,
    broken,
    art: p.imageSrc
      ? { src: p.imageSrc, className: p.imageClassName, strong: p.bleedScrim === 'strong' }
      : undefined,
    collapsed: (
      <div className="flex flex-col gap-1">
        <Tag>{p.tag}</Tag>
        <h3 className={cn('line-clamp-3 text-size-lg font-extrabold leading-5', ON_ART.title)}>{p.title}</h3>
      </div>
    ),
    expanded: (
      <div className="flex h-full flex-col justify-between">
        <div className="flex w-64 max-w-full flex-col gap-1.5">
          <Tag>{p.tag}</Tag>
          <h3 className={cn('text-size-2xl font-extrabold leading-7', ON_ART.title)}>{p.title}</h3>
          <p className={cn('line-clamp-4 text-sm leading-5', ON_ART.body)}>{p.body}</p>
        </div>
        {/* Click bubbles to the card so the CTA gets the same 2.2s launch spinner. */}
        <Button
          type="button"
          tabIndex={-1}
          className="h-9 w-fit px-4 text-sm font-medium active:scale-[0.97]"
        >
          {p.buttonLabel}
        </Button>
      </div>
    ),
  }
}

function useVipSlot(onAction: () => void): Slot {
  const { displayPercent, levelLabel, barTone, crownTone, updatedLabel } = useVipLevelUpCeremony()
  const pct = Math.round(Math.min(100, Math.max(0, displayPercent)))
  /* Real Silver unlocks from lib/lumen/vip-hub.ts — one short fact (COPY.md). */
  const nextPerk = levelLabel.endsWith('Silver')
    ? `Weekly Boost + $${SILVER_LEVEL_UP_REWARD.amount} Level Up Bonus`
    : 'Open VIP Hub for your next rewards'
  return {
    id: 'vip',
    label: 'VIP Progress — Open VIP Hub',
    onAction,
    collapsed: (
      <div className="flex h-full flex-col justify-between">
        <h3 className="text-sm font-semibold text-foreground">VIP Progress</h3>
        <div className="flex flex-col gap-2">
          <VipProgressCrown tone={crownTone} size={32} className="size-8" />
          <span className="text-size-2xl font-bold tabular-nums text-foreground">{pct}%</span>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted-2">
            <VipProgressBarFill percent={pct} tone={barTone} />
          </div>
        </div>
      </div>
    ),
    expanded: (
      <div className="flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold text-foreground">VIP Progress</h3>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
            Open VIP Hub
            <ShellIcon name="external" tone="token" className="size-3.5" aria-hidden />
          </span>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <VipProgressCrown tone={crownTone} size={40} className="size-10" />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium text-foreground">{levelLabel}</span>
              <span className="text-xs text-muted-foreground">{nextPerk}</span>
            </div>
            <span className="text-size-2xl font-bold tabular-nums text-foreground">{pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-muted-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="VIP tier progress">
            <VipProgressBarFill percent={pct} tone={barTone} />
          </div>
          <span className="text-xs text-muted-foreground">{updatedLabel}</span>
        </div>
      </div>
    ),
  }
}

function useRaceSlot(onAction: () => void): Slot {
  const [remaining, setRemaining] = useState(DAILY_RACE_STATUS.endsInSeconds)
  useEffect(() => {
    const id = window.setInterval(() => setRemaining((s) => (s <= 0 ? DAILY_RACE_STATUS.endsInSeconds : s - 1)), 1000)
    return () => window.clearInterval(id)
  }, [])
  const clock = formatRaceCountdown(remaining)
  const top3 = DAILY_RACE_LEADERBOARD.slice(0, 3)
  const cells: [string, string][] = [
    [DAILY_RACE_STATUS.position, 'Position'],
    [DAILY_RACE_STATUS.wagered, 'Wagered'],
    [DAILY_RACE_STATUS.prize, 'Current Prize'],
  ]
  return {
    id: 'race',
    label: 'Open $25k Daily Race in VIP Hub',
    onAction,
    collapsed: (
      <div className="flex h-full flex-col justify-between">
        <h3 className="text-sm font-semibold text-foreground">$25k Daily Race</h3>
        <div className="flex flex-col gap-1">
          <span className="font-mono text-sm tabular-nums text-foreground">{clock}</span>
          <span className="text-size-2xl font-bold text-foreground">{DAILY_RACE_STATUS.position}</span>
          <span className="text-xs text-muted-foreground">Position</span>
        </div>
      </div>
    ),
    expanded: (
      <div className="flex h-full flex-col justify-between gap-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold text-foreground">$25k Daily Race</h3>
          <span className="font-mono text-sm tabular-nums text-foreground">{clock}</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {cells.map(([value, label]) => (
            <div key={label} className="flex flex-col rounded-md border border-border bg-surface-muted-1 px-2 py-2">
              <span className="text-sm font-semibold leading-tight text-foreground">{value}</span>
              <span className="mt-0.5 text-size-xxs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
        <ol className="flex flex-col gap-1">
          {top3.map((r) => (
            <li key={r.id} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-foreground">
                <span className="w-4 tabular-nums text-muted-foreground">{r.rank}</span>
                {r.player ?? 'Hidden'}
              </span>
              <span className="tabular-nums text-success">{formatRaceMoney(r.prizeUsd)}</span>
            </li>
          ))}
        </ol>
      </div>
    ),
  }
}

/* ── Row ────────────────────────────────────────────────────── */

function RowSkeleton() {
  return (
    <div data-name="banner-row" className="px-6" aria-busy="true" aria-label="Loading banners">
      <div className="hidden h-60 gap-3 md:flex">
        <div className="lm-shimmer h-full grow-[3.4] basis-0 rounded-lg bg-card" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="lm-shimmer h-full grow basis-0 rounded-lg bg-card" />
        ))}
      </div>
      <div className="flex gap-3 overflow-hidden md:hidden">
        {[0, 1].map((i) => (
          <div key={i} className="lm-shimmer h-52 w-72 shrink-0 rounded-lg bg-card" />
        ))}
      </div>
    </div>
  )
}

export function ExpandingBannerRow() {
  const router = useRouter()
  const params = useSearchParams()
  const state = params.get('state')
  const { loggedIn, setVipHubOpen, setCashierOpen, startNavigating } = useShell()

  const go = (href: string) => {
    startNavigating(href)
    router.push(href)
  }

  const vip = useVipSlot(() => setVipHubOpen(true))
  const race = useRaceSlot(() => setVipHubOpen(true, '$25k Daily Race'))

  const actions: Record<string, () => void> = {
    'chicken-fire': () => go('/casino/category/originals'),
    halloween: () => go('/casino/category/halloween'),
    'casino-rakeback': () => setVipHubOpen(true),
    '100-free-spins': () => setCashierOpen(true),
  }
  const promos = (state === 'single' ? CASINO_LOBBY_PROMO_BANNERS.slice(0, 1) : CASINO_LOBBY_PROMO_BANNERS).map(
    (p, i) => promoSlot(p, actions[p.id ?? ''] ?? (() => {}), state === 'error' && i === 1),
  )

  const slots: Slot[] = [
    ...(loggedIn && state !== 'single' ? [vip, race] : []),
    ...promos,
  ]

  const firstPromo = promos[0]?.id ?? slots[0]?.id
  const [hoverId, setOpenId] = useState<string | null>(params.get('open'))
  /* Shell login state hydrates after first render — resolve, don't reset. */
  const openId = hoverId && slots.some((s) => s.id === hoverId) ? hoverId : firstPromo

  if (state === 'loading') return <RowSkeleton />

  return (
    <div data-name="banner-row" data-variant="expanding">
      {/* Desktop accordion */}
      <div className="hidden gap-3 px-6 md:flex">
        {slots.map((s) => (
          <AccordionCard key={s.id} slot={s} open={slots.length === 1 || s.id === openId} onOpen={() => setOpenId(s.id)} />
        ))}
      </div>
      {/* Mobile: swipe only, full info per card */}
      <div className="overflow-x-auto overscroll-x-contain [scrollbar-width:none] md:hidden">
        <div className="flex w-max snap-x snap-mandatory gap-3 px-4">
          {slots.map((s) => (
            <div key={s.id} className="snap-start">
              <AccordionCard slot={s} open mobile onOpen={() => {}} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ExpandingBannersPrototype() {
  return <CasinoLobby bannerRow={<ExpandingBannerRow />} />
}
