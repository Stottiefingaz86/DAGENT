'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  IconBallFootball,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconPlayerPlay,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { ShelfSeeMore } from '@/components/lumen/shelf-see-more'
import { CasinoLiveWinsCarousel } from '@/components/lumen/casino-live-wins-carousel'
import {
  SoccerBetslip,
  type SoccerSlipPick,
} from '@/components/lumen/soccer-betslip'
import { useShell } from '@/components/site/shell-context'
import { revealShellDock } from '@/components/site/shell-scroll'
import { flyBetDotToSlip } from '@/lib/lumen/vip-celebrate'
import {
  DESKTOP_MARKET_HEADERS,
  SOCCER_COUNTRY_GROUPS,
  SOCCER_COUNTRY_OPTIONS,
  SOCCER_LEAGUE_MODES,
  SOCCER_LEAGUE_OPTIONS,
  SOCCER_MODES,
  SOCCER_OUTRIGHTS,
  SOCCER_QUICK_LINKS,
  isSoccerLeagueView,
  soccerSectionsForFilter,
  type SoccerEvent,
  type SoccerLeagueSection,
  type SoccerMode,
  type SoccerOdds,
  type SoccerQuickLink,
} from '@/lib/lumen/soccer-sport'
import { cn } from '@/lib/utils'

const CARD =
  'rounded-[10px] border border-border bg-card shadow-[0_0_16px_rgba(0,0,0,0.06)]'
const TILE_SPRING = { type: 'spring' as const, stiffness: 260, damping: 28, mass: 0.85 }

/** Custom menu — portals to body so mobile sticky chrome never clips it. */
function BreadcrumbMenu({
  label,
  options,
  active,
  onPick,
  emphasize,
}: {
  label: string
  options: { id: string; label: string }[]
  active: string
  onPick: (id: string) => void
  emphasize?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const rootRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)

  useLayoutEffect(() => {
    if (!open || !rootRef.current) return
    const r = rootRef.current.getBoundingClientRect()
    const width = 200
    const left = Math.min(r.left, window.innerWidth - width - 8)
    setPos({ top: r.bottom + 6, left: Math.max(8, left) })
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node
      if (rootRef.current?.contains(t) || menuRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('touchstart', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('touchstart', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative inline-flex shrink-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-1.5 leading-none transition-colors hover:bg-accent hover:text-foreground',
          open && 'bg-accent text-foreground',
          emphasize ? 'font-medium text-foreground' : 'text-muted-foreground',
        )}
      >
        {label}
        <IconChevronDown
          className={cn('size-3.5 shrink-0 opacity-70 transition-transform', open && 'rotate-180')}
          stroke={1.5}
        />
      </button>
      {open && typeof document !== 'undefined'
        ? createPortal(
            <ul
              ref={menuRef}
              role="listbox"
              style={{ top: pos.top, left: pos.left }}
              className="fixed z-[220] max-h-[min(60vh,320px)] min-w-[180px] overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
            >
              {options.map((opt) => (
                <li key={opt.id} role="option" aria-selected={opt.id === active}>
                  <button
                    type="button"
                    className={cn(
                      'flex w-full cursor-pointer items-center rounded-sm px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground',
                      opt.id === active && 'bg-accent/60 font-medium',
                    )}
                    onClick={() => {
                      onPick(opt.id)
                      setOpen(false)
                    }}
                  >
                    {opt.label}
                  </button>
                </li>
              ))}
            </ul>,
            document.body,
          )
        : null}
    </div>
  )
}

function marketForPick(pick: SoccerOdds, all: SoccerOdds[]): string {
  const i = all.findIndex((p) => p.id === pick.id)
  if (i < 0) return 'Moneyline'
  if (i < 3) return DESKTOP_MARKET_HEADERS[0]
  if (i < 5) return DESKTOP_MARKET_HEADERS[1]
  if (i < 7) return DESKTOP_MARKET_HEADERS[2]
  return DESKTOP_MARKET_HEADERS[3]
}

function ModePillTrack({
  active,
  onChange,
  modes,
}: {
  active: SoccerMode
  onChange: (id: SoccerMode) => void
  modes: { id: SoccerMode; label: string }[]
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [thumb, setThumb] = useState({ x: 0, w: 0, ready: false })
  const [coveredId, setCoveredId] = useState(active)

  const measureThumb = useCallback(() => {
    const track = trackRef.current
    const btn = track?.querySelector<HTMLElement>('[data-sub-menu-pill][data-active="true"]')
    if (!track || !btn) return
    setThumb({ x: btn.offsetLeft, w: btn.offsetWidth, ready: true })
  }, [])

  useLayoutEffect(() => {
    measureThumb()
    const track = trackRef.current
    if (!track) return
    const ro = new ResizeObserver(measureThumb)
    ro.observe(track)
    return () => ro.disconnect()
  }, [active, modes, measureThumb])

  useLayoutEffect(() => {
    const id = window.setTimeout(() => setCoveredId(active), 280)
    return () => window.clearTimeout(id)
  }, [active])

  return (
    <div data-name="soccer-mode-pills" className="mb-4">
      <div
        ref={trackRef}
        data-name="sub-menu-pill-track"
        className="relative flex h-12 w-max max-w-full items-center gap-1 overflow-x-auto rounded-full bg-secondary p-0.5"
        role="tablist"
        aria-label="Soccer views"
      >
        <span
          aria-hidden
          data-sub-menu-thumb=""
          className="pointer-events-none absolute top-0.5 h-11 rounded-full bg-primary transition-[left,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ left: thumb.x, width: thumb.w, opacity: thumb.ready ? 1 : 0 }}
        />
        {modes.map((item) => {
          const on = item.id === active
          const covered = item.id === coveredId
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={on}
              data-sub-menu-pill=""
              data-active={on ? 'true' : 'false'}
              onClick={() => onChange(item.id)}
              className={cn(
                'shell-chrome-btn relative z-10 h-11 shrink-0 rounded-full bg-transparent px-4 text-sm leading-5',
                covered
                  ? 'font-medium text-primary-foreground'
                  : 'font-normal text-muted-foreground hover:bg-[var(--surface-muted-3)] hover:text-foreground dark:hover:bg-accent',
              )}
            >
              {item.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Casino sub-nav glass chevrons — sit on the clipped odds rail edges. */
const ODDS_EDGE_ARROW =
  'absolute top-1/2 z-20 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-border/60 bg-background/55 text-foreground backdrop-blur-md outline-none hover:bg-background/75 focus-visible:ring-2 focus-visible:ring-ring'

function LeagueQuickLinks({
  links,
  activeId,
  onPick,
  onNavigate,
}: {
  links: SoccerQuickLink[]
  activeId: string
  onPick: (id: string) => void
  onNavigate?: (href: string) => void
}) {
  return (
    <div data-name="quicklinks" className="-mx-4 mb-5 md:mx-0">
      {/*
        overflow-x forces a clip port — pad the scroll box so lift/scale/border
        never gets chopped (All Soccer was losing its bottom corners).
      */}
      <div className="overflow-x-auto px-4 py-5 scrollbar-hide md:px-0">
        <div className="flex w-max items-end gap-2 px-0.5">
          {links.map((link, i) => {
            const external = Boolean(link.href)
            const on = !external && activeId === link.id
            const casinoStart = Boolean(link.href) && !links[i - 1]?.href
            const isArt = Boolean(link.art && link.icon)

            if (isArt) {
              return (
                <motion.button
                  key={link.id}
                  type="button"
                  aria-label={`Go to ${link.label}`}
                  onClick={() => {
                    if (link.href && onNavigate) onNavigate(link.href)
                  }}
                  whileHover={{ scale: 1.04, y: -4, zIndex: 10 }}
                  whileTap={{ scale: 1.01, y: -1 }}
                  transition={TILE_SPRING}
                  className={cn(
                    /* Same outer height as league chips (92); width keeps DVD 152/207. */
                    'group relative z-0 h-[92px] w-[68px] shrink-0 overflow-hidden rounded-[10px]',
                    'border border-border bg-card shadow-[0_0_16px_rgba(0,0,0,0.06)]',
                    'outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0',
                    'motion-reduce:!transform-none',
                    casinoStart && 'ml-3',
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={link.icon}
                    alt=""
                    className="absolute inset-0 size-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-1 pb-1.5 pt-6">
                    <span className="block truncate text-center text-[9px] font-semibold leading-tight text-white">
                      {link.label}
                    </span>
                  </span>
                </motion.button>
              )
            }

            return (
              <motion.button
                key={link.id}
                type="button"
                aria-pressed={external ? undefined : on}
                aria-label={link.label}
                onClick={() => {
                  if (link.href && onNavigate) {
                    onNavigate(link.href)
                    return
                  }
                  onPick(link.id)
                }}
                animate={on ? { scale: 1.04, y: -4, zIndex: 10 } : { scale: 1, y: 0, zIndex: 0 }}
                whileHover={{ scale: 1.04, y: -4, zIndex: 10 }}
                whileTap={{ scale: 1.01, y: -1 }}
                transition={TILE_SPRING}
                className={cn(
                  'relative z-0 flex h-[92px] w-[80px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-[10px] border px-1.5 py-2.5 text-center',
                  'shadow-[0_0_16px_rgba(0,0,0,0.06)]',
                  'outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0',
                  'transition-[background-color,border-color,box-shadow] duration-150',
                  'motion-reduce:!transform-none',
                  on
                    ? 'border-border bg-secondary/80 shadow-[0_0_20px_rgba(0,0,0,0.1)]'
                    : 'border-transparent bg-card hover:border-border hover:bg-secondary/80 hover:shadow-[0_0_20px_rgba(0,0,0,0.1)]',
                )}
              >
                <span
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-md',
                    link.id === 'all' || !link.icon ? 'bg-transparent' : 'bg-white',
                  )}
                >
                  {link.id === 'all' || !link.icon ? (
                    <IconBallFootball className="size-7 text-foreground" stroke={1.5} />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={link.icon}
                      alt=""
                      width={28}
                      height={28}
                      className="max-h-7 max-w-7 object-contain"
                    />
                  )}
                </span>
                <span className="w-full px-0.5 text-center text-[10px] font-medium leading-[12px] text-foreground">
                  {link.label}
                </span>
              </motion.button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function OddsButton({
  pick,
  selected,
  onSelect,
  className,
}: {
  pick: SoccerOdds
  selected: boolean
  onSelect: (pick: SoccerOdds, originEl?: HTMLElement | null) => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={(e) => onSelect(pick, e.currentTarget)}
      className={cn(
        'flex min-w-[72px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg border px-2 py-1.5 text-center transition-colors',
        /* Light: popover === card white — use secondary wash + border so chips read as cards */
        selected
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-secondary text-foreground hover:bg-accent',
        className,
      )}
    >
      <span
        className={cn(
          'text-[10px] font-medium leading-3.5',
          selected ? 'text-primary-foreground/80' : 'text-muted-foreground',
        )}
      >
        {pick.label}
      </span>
      <span className="text-sm font-semibold tabular-nums leading-5">{pick.odds}</span>
    </button>
  )
}

const EVENT_ROW_H = 'h-[112px]'
const SCORE_COL_W = 'w-[min(42%,300px)]'

function EventScoreboard({ event }: { event: SoccerEvent }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1 flex items-center gap-2">
        {event.live ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
            <IconPlayerPlay className="size-3.5 fill-current" stroke={0} />
            {event.when}
          </span>
        ) : (
          <Typography as="span" shape="xs" variant="muted">
            {event.when}
          </Typography>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="size-5 shrink-0 rounded-full bg-surface-muted-3" aria-hidden />
            <Typography as="span" shape="small" weight="medium" className="truncate">
              {event.home}
            </Typography>
            {event.score ? (
              <span className="ml-auto tabular-nums text-sm font-semibold">{event.score[0]}</span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <span className="size-5 shrink-0 rounded-full bg-surface-muted-3" aria-hidden />
            <Typography as="span" shape="small" weight="medium" className="truncate">
              {event.away}
            </Typography>
            {event.score ? (
              <span className="ml-auto tabular-nums text-sm font-semibold">{event.score[1]}</span>
            ) : null}
          </div>
        </div>
        <IconChevronRight className="size-4 shrink-0 text-muted-foreground" stroke={1.5} />
      </div>
    </div>
  )
}

function DesktopMarketColumns({
  picks,
  selectedIds,
  onSelect,
}: {
  picks: SoccerOdds[]
  selectedIds: Set<string>
  onSelect: (pick: SoccerOdds, originEl?: HTMLElement | null) => void
}) {
  const groups = [
    picks.slice(0, 3),
    picks.slice(3, 5),
    picks.slice(5, 7),
    picks.slice(7, 10),
  ] as const

  return (
    <div className="flex w-max gap-2">
      {groups.map((group, i) => (
        <div
          key={DESKTOP_MARKET_HEADERS[i] ?? i}
          className="flex w-[220px] shrink-0 flex-col gap-1"
        >
          <Typography as="span" shape="xs" variant="muted" className="text-center">
            {DESKTOP_MARKET_HEADERS[i]}
          </Typography>
          <div className="flex gap-1">
            {group.map((pick) => (
              <OddsButton
                key={pick.id}
                pick={pick}
                selected={selectedIds.has(pick.id)}
                onSelect={onSelect}
                className="min-w-0 flex-1"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Desktop odds scroller — edge chevrons only for fine pointer (mouse).
 * Never on touch / coarse pointer — swipe only (Chris hard rule).
 */
function EventOddsRail({
  picks,
  selectedIds,
  onSelect,
  label,
}: {
  picks: SoccerOdds[]
  selectedIds: Set<string>
  onSelect: (pick: SoccerOdds, originEl?: HTMLElement | null) => void
  label: string
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canBack, setCanBack] = useState(false)
  const [canMore, setCanMore] = useState(false)
  const [showArrows, setShowArrows] = useState(false)

  const measure = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanBack(el.scrollLeft > 8)
    setCanMore(el.scrollLeft + el.clientWidth < el.scrollWidth - 8)
  }, [])

  useLayoutEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)')
    const sync = () => setShowArrows(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [measure, picks.length])

  const scrollBy = (dir: -1 | 1) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: dir * Math.min(220, el.clientWidth * 0.7), behavior: 'smooth' })
  }

  return (
    <div className="relative min-w-0 flex-1 overflow-hidden">
      <div
        ref={scrollRef}
        data-name="event-odds-scroll"
        className="scrollbar-hide flex h-full items-center overflow-x-auto overflow-y-hidden"
        onScroll={measure}
      >
        <div className="w-max px-3">
          <DesktopMarketColumns picks={picks} selectedIds={selectedIds} onSelect={onSelect} />
        </div>
      </div>
      {showArrows && canBack ? (
        <button
          type="button"
          aria-label={`Scroll ${label} markets back`}
          className={cn(ODDS_EDGE_ARROW, 'left-1')}
          onClick={() => scrollBy(-1)}
        >
          <IconChevronLeft className="size-4" strokeWidth={2} />
        </button>
      ) : null}
      {showArrows && canMore ? (
        <button
          type="button"
          aria-label={`Scroll ${label} markets forward`}
          className={cn(ODDS_EDGE_ARROW, 'right-1')}
          onClick={() => scrollBy(1)}
        >
          <IconChevronRight className="size-4" strokeWidth={2} />
        </button>
      ) : null}
    </div>
  )
}

/**
 * Mobile — full desktop markets; swipe only (never overlay chevrons).
 * Full-bleed to card edges — no inset gutters while scrolling.
 */
function MobileOddsCarousel({
  picks,
  selectedIds,
  onSelect,
}: {
  picks: SoccerOdds[]
  selectedIds: Set<string>
  onSelect: (pick: SoccerOdds, originEl?: HTMLElement | null) => void
}) {
  return (
    <div
      data-name="mobile-odds-carousel"
      /* No touch-pan-x — it locks vertical page scroll when finger starts on the rail. */
      className="scrollbar-hide min-w-0 overflow-x-auto overscroll-x-contain"
    >
      <div className="flex w-max gap-1.5 px-3">
        {picks.map((pick) => (
          <OddsButton
            key={pick.id}
            pick={pick}
            selected={selectedIds.has(pick.id)}
            onSelect={onSelect}
            className="min-w-[76px] flex-none"
          />
        ))}
      </div>
    </div>
  )
}

function EventRowMobile({
  event,
  selectedIds,
  onSelect,
}: {
  event: SoccerEvent
  selectedIds: Set<string>
  onSelect: (pick: SoccerOdds, event: SoccerEvent, originEl?: HTMLElement | null) => void
}) {
  const picks = event.desktopPicks ?? event.picks
  return (
    <article data-name="event-row-mobile" className="border-b border-border last:border-b-0 md:hidden">
      <div className="flex flex-col gap-3 py-3">
        <div className="px-3">
          <EventScoreboard event={event} />
        </div>
        <MobileOddsCarousel
          picks={picks}
          selectedIds={selectedIds}
          onSelect={(p, originEl) => onSelect(p, event, originEl)}
        />
      </div>
    </article>
  )
}

function LeagueGamesCard({
  section,
  expanded,
  onToggleMore,
  selectedIds,
  onSelect,
  hideSeeAll = false,
  onSeeAll,
}: {
  section: SoccerLeagueSection
  expanded: boolean
  onToggleMore: () => void
  selectedIds: Set<string>
  onSelect: (pick: SoccerOdds, event: SoccerEvent, originEl?: HTMLElement | null) => void
  /** League drill (355:27661) — already in-league, no See All. */
  hideSeeAll?: boolean
  onSeeAll?: (leagueId: string) => void
}) {
  const visible = expanded ? section.events : section.events.slice(0, 2)

  return (
    <section data-name="league-section" className="mb-6">
      <div className="mb-3 flex h-9 items-center gap-2 px-0.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={section.icon} alt="" width={18} height={18} className="size-[18px] object-contain" />
        <Typography as="h2" shape="small" weight="semibold" className="min-w-0 flex-1 truncate">
          {section.name}
        </Typography>
        {!hideSeeAll ? (
          <ShelfSeeMore label="See All" onClick={() => onSeeAll?.(section.id)} />
        ) : null}
      </div>

      {/* Mobile stacked rows */}
      <div className={cn(CARD, 'overflow-hidden md:hidden')}>
        {visible.map((event) => (
          <EventRowMobile
            key={event.id}
            event={event}
            selectedIds={selectedIds}
            onSelect={onSelect}
          />
        ))}
      </div>

      {/* Desktop: one flex row per event — each odds rail has its own sub-nav arrows */}
      <div className={cn(CARD, 'hidden overflow-hidden md:block')}>
        {visible.map((event) => {
          const desktop = event.desktopPicks ?? event.picks
          return (
            <div
              key={event.id}
              className="flex border-b border-border last:border-b-0"
            >
              <div
                className={cn(
                  SCORE_COL_W,
                  EVENT_ROW_H,
                  'flex shrink-0 items-center border-r border-border px-4',
                )}
              >
                <EventScoreboard event={event} />
              </div>
              <div className={cn(EVENT_ROW_H, 'flex min-w-0 flex-1')}>
                <EventOddsRail
                  picks={desktop}
                  selectedIds={selectedIds}
                  onSelect={(pick, originEl) => onSelect(pick, event, originEl)}
                  label={`${event.home} vs ${event.away}`}
                />
              </div>
            </div>
          )
        })}
      </div>

      {section.moreCount > 0 && !expanded ? (
        <div className="mt-2 flex justify-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-muted-foreground hover:text-foreground"
            onClick={onToggleMore}
          >
            Show {section.moreCount} More
            <IconChevronDown className="size-3.5" stroke={1.5} />
          </Button>
        </div>
      ) : null}
    </section>
  )
}

function AllLeaguesView({ onSelectLeague }: { onSelectLeague: (id: string) => void }) {
  const [open, setOpen] = useState<Record<string, boolean>>({ top: true, england: true })

  return (
    <div className="space-y-2">
      {SOCCER_COUNTRY_GROUPS.map((group) => {
        const isOpen = !!open[group.id]
        return (
          <div key={group.id} className={CARD}>
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:!bg-surface-muted-3"
              onClick={() => setOpen((s) => ({ ...s, [group.id]: !isOpen }))}
              aria-expanded={isOpen}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={group.flag} alt="" width={20} height={20} className="size-5 object-contain" />
              <Typography as="span" shape="small" weight="medium" className="flex-1">
                {group.name}
              </Typography>
              <IconChevronDown
                className={cn(
                  'size-4 text-muted-foreground transition-transform',
                  isOpen && 'rotate-180',
                )}
                stroke={1.5}
              />
            </button>
            {isOpen && group.leagues.length > 0 ? (
              <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3">
                {group.leagues.map((league) => (
                  <button
                    key={league.id}
                    type="button"
                    onClick={() => onSelectLeague(league.id)}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-popover px-3 py-1.5 text-sm transition-colors hover:bg-accent"
                  >
                    {league.icon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={league.icon}
                        alt=""
                        width={16}
                        height={16}
                        className="size-4 object-contain"
                      />
                    ) : null}
                    {league.name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function OutrightsView() {
  return (
    <div className={CARD}>
      {SOCCER_OUTRIGHTS.map((row) => (
        <button
          key={row.id}
          type="button"
          className="flex w-full items-center justify-between gap-3 border-b border-border px-4 py-3.5 text-left last:border-b-0 hover:!bg-surface-muted-3"
        >
          <Typography as="span" shape="small" weight="medium">
            {row.name}
          </Typography>
          <IconChevronRight className="size-4 shrink-0 text-muted-foreground" stroke={1.5} />
        </button>
      ))}
    </div>
  )
}

/** PropShopX 321:209953 — Soccer Games; 355:27661 — league-specific drill. */
export function SoccerSportPage({ className }: { className?: string }) {
  const router = useRouter()
  const { startNavigating } = useShell()
  const [mode, setMode] = useState<SoccerMode>('games')
  const [leagueFilter, setLeagueFilter] = useState('all')
  const [countryId, setCountryId] = useState<string>('all')
  const [leagueId, setLeagueId] = useState<string>('all')
  const [slipPicks, setSlipPicks] = useState<SoccerSlipPick[]>([])
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const leagueView = isSoccerLeagueView(leagueFilter)
  const sections = soccerSectionsForFilter(leagueFilter)
  /** Full sport rail always — football Figma siblings only apply to NFL/NCAA, not soccer. */
  const modePills = leagueView ? SOCCER_LEAGUE_MODES : SOCCER_MODES
  /** League page only has Games | All Leagues — clamp Outrights away. */
  const displayMode: SoccerMode =
    leagueView && mode === 'outrights' ? 'games' : mode

  const selectedIds = useMemo(() => new Set(slipPicks.map((p) => p.id)), [slipPicks])

  const countryLabel =
    SOCCER_COUNTRY_OPTIONS.find((c) => c.id === countryId)?.label ?? 'Select Country'
  const leagueOptions = useMemo(
    () =>
      SOCCER_LEAGUE_OPTIONS.filter(
        (l) => countryId === 'all' || l.country === 'all' || l.country === countryId,
      ),
    [countryId],
  )
  const leagueLabel =
    SOCCER_LEAGUE_OPTIONS.find((l) => l.id === leagueId)?.label ?? 'Select League'

  const exitLeagueView = () => {
    setLeagueFilter('all')
    setLeagueId('all')
    setCountryId('all')
    setMode('games')
  }

  const goBack = () => {
    if (leagueView) {
      exitLeagueView()
      return
    }
    startNavigating('/sports')
    router.push('/sports')
  }

  const onTogglePick = (
    pick: SoccerOdds,
    event: SoccerEvent,
    originEl?: HTMLElement | null,
  ) => {
    const removing = slipPicks.some((p) => p.id === pick.id)
    if (removing) {
      setSlipPicks((prev) => prev.filter((p) => p.id !== pick.id))
      return
    }
    const all = event.desktopPicks ?? event.picks
    const next: SoccerSlipPick = {
      id: pick.id,
      label: pick.label,
      odds: pick.odds,
      eventLabel: `${event.home} vs ${event.away}`,
      market: marketForPick(pick, all),
    }
    setSlipPicks((prev) => [next, ...prev])
    revealShellDock()
    flyBetDotToSlip(originEl, next.id)
  }

  const onRemovePick = (id: string) => {
    setSlipPicks((prev) => prev.filter((p) => p.id !== id))
  }

  const onModeChange = (id: SoccerMode) => {
    if (leagueView && id === 'outrights') return
    setMode(id)
  }

  const onPickCountry = (id: string) => {
    setCountryId(id)
    setLeagueId('all')
    if (id === 'england') {
      setLeagueFilter('epl')
      setLeagueId('epl')
    } else if (id === 'spain') {
      setLeagueFilter('laliga')
      setLeagueId('laliga')
    } else if (id === 'italy') {
      setLeagueFilter('seriea')
      setLeagueId('seriea')
    } else if (id === 'germany') {
      setLeagueFilter('bundesliga')
      setLeagueId('bundesliga')
    } else if (id === 'france') {
      setLeagueFilter('ligue1')
      setLeagueId('ligue1')
    } else {
      setLeagueFilter('all')
    }
    setMode('games')
  }

  const enterLeague = (id: string) => {
    if (id === 'all') {
      exitLeagueView()
      return
    }
    setLeagueFilter(id)
    setLeagueId(id)
    const opt = SOCCER_LEAGUE_OPTIONS.find((l) => l.id === id)
    if (opt && opt.country !== 'all') setCountryId(opt.country)
    else if (id === 'epl' || id === 'championship') setCountryId('england')
    else if (id === 'laliga') setCountryId('spain')
    else if (id === 'seriea') setCountryId('italy')
    else if (id === 'bundesliga') setCountryId('germany')
    else if (id === 'ligue1') setCountryId('france')
    setMode('games')
  }

  const onPickLeague = (id: string) => {
    if (id === 'all') {
      exitLeagueView()
      setMode('leagues')
      return
    }
    enterLeague(id)
  }

  const onQuickLink = (id: string) => {
    enterLeague(id)
  }

  const onQuickNavigate = (href: string) => {
    startNavigating(href)
    router.push(href)
  }

  return (
    <div
      data-name={leagueView ? 'soccer-league-page' : 'soccer-sport-page'}
      className={cn('mx-auto w-full max-w-[1440px] px-4 py-4 md:px-6 md:py-6', className)}
    >
      {/* Breadcrumbs — swipe to see overflow (scrollport ≠ flex row). */}
      <div data-name="breadcrumbs" className="mb-4 flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={goBack}
          aria-label={leagueView ? 'Back to soccer' : 'Back to sports home'}
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary transition-colors hover:bg-accent"
        >
          <IconChevronLeft className="size-4" stroke={1.5} />
        </button>
        <div className="scrollbar-hide min-w-0 flex-1 overflow-x-auto overscroll-x-contain">
          <div className="flex w-max items-center gap-1.5 whitespace-nowrap pr-1 text-sm leading-none">
            <span className="inline-flex h-7 shrink-0 items-center gap-1.5 font-medium text-foreground">
              <IconBallFootball className="size-4 shrink-0" stroke={1.5} />
              Soccer
            </span>
            <span className="inline-flex h-7 shrink-0 items-center text-muted-foreground/70" aria-hidden>
              /
            </span>
            <BreadcrumbMenu
              label={countryId === 'all' ? 'Select Country' : countryLabel}
              options={SOCCER_COUNTRY_OPTIONS.map((c) => ({ id: c.id, label: c.label }))}
              active={countryId}
              onPick={onPickCountry}
              emphasize={leagueView}
            />
            <span className="inline-flex h-7 shrink-0 items-center text-muted-foreground/70" aria-hidden>
              /
            </span>
            <BreadcrumbMenu
              label={leagueId === 'all' ? 'Select League' : leagueLabel}
              options={leagueOptions.map((l) => ({ id: l.id, label: l.label }))}
              active={leagueId}
              onPick={onPickLeague}
              emphasize={leagueView}
            />
          </div>
        </div>
      </div>

      <LeagueQuickLinks
        links={SOCCER_QUICK_LINKS}
        activeId={leagueFilter}
        onPick={onQuickLink}
        onNavigate={onQuickNavigate}
      />

      <ModePillTrack active={displayMode} onChange={onModeChange} modes={modePills} />

      {displayMode === 'games' ? (
        sections.map((section) => (
          <LeagueGamesCard
            key={section.id}
            section={section}
            expanded={leagueView ? true : !!expanded[section.id]}
            onToggleMore={() =>
              setExpanded((s) => ({ ...s, [section.id]: !s[section.id] }))
            }
            selectedIds={selectedIds}
            onSelect={onTogglePick}
            hideSeeAll={leagueView}
            onSeeAll={enterLeague}
          />
        ))
      ) : null}

      {displayMode === 'outrights' && !leagueView ? <OutrightsView /> : null}
      {displayMode === 'leagues' ? <AllLeaguesView onSelectLeague={enterLeague} /> : null}

      {displayMode === 'games' && sections.length === 0 ? (
        <div className={cn(CARD, 'px-6 py-12 text-center')}>
          <Typography as="p" shape="small" variant="muted">
            No games for this league right now.
          </Typography>
        </div>
      ) : null}

      {/* Sports → casino funnel — social proof under the board. */}
      <div className="-mx-4 mt-6 md:-mx-6">
        <CasinoLiveWinsCarousel />
      </div>

      <SoccerBetslip
        picks={slipPicks}
        onRemove={onRemovePick}
        onClear={() => setSlipPicks([])}
      />
    </div>
  )
}
