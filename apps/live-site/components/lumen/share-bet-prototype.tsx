'use client'

/**
 * DRAFT — Share my bet (job on-sportbook-after-a-bet-we-want-to-be-able-to-s).
 * Proposal draft only: looks right for review, not wired.
 *
 * Views (query params):
 *   ?view=slip                 real SoccerBetslip on "Bets placed" + Share icon beside My Bets
 *   ?view=slip&step=share      Share step inside the betslip (desktop; mobile fallback when no native sheet)
 *   ?view=history              Bet History, first row expanded, Share beside Print
 *   ?view=history&menu=open    Share popover (desktop) / bottom sheet (mobile)
 *   ?view=landing              friend opens the link: /sports/soccer with the picks in an open betslip
 *   &state=partial|settled|missing|error   (landing)
 *   &share=loading|error                   (share panel)
 */

import { useEffect, useState, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  IconBrandTelegram,
  IconBrandWhatsapp,
  IconBrandX,
  IconCheck,
  IconCopy,
  IconDownload,
  IconLink,
  IconRefresh,
  IconShare2,
  IconX,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Typography } from '@/components/ui/typography'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { BetHistoryPage } from '@/components/lumen/bet-history-page'
import { SoccerBetslip, type SoccerSlipPick } from '@/components/lumen/soccer-betslip'
import { SoccerSportPage } from '@/components/lumen/soccer-sport-page'
import { ShellFrame } from '@/components/site/shell-frame'
import { ShellWordmark } from '@/components/site/shell-icons'
import { ShellNavPathProvider } from '@/components/site/shell-nav-path'
import { BET_STATUS_STYLE, type BetHistoryRow, type BetStatus } from '@/lib/lumen/bet-history'
import { cn } from '@/lib/utils'

export const SHARE_BET_SLUG = 'on-sportbook-after-a-bet-we-want-to-be-able-to-s'

/* Lumen content card: rounded-lg (the 10px radius token) + border + bg-card + Lumen shadow scale.
   (The legacy 0 0 16px arbitrary shadow fails tokens:lint, so the scale token is used.) */
const CARD = 'rounded-lg border border-border bg-card shadow-sm'

type Leg = { pick: string; market: string; event: string; odds: string }

type SharedBet = {
  label: string
  odds: string
  legs: Leg[]
  stake: string
  toWin: string
  status: BetStatus
  placed: string
  /** Lands on the bet's own sport with the picks in the slip (SPORTSBOOK.md). */
  link: string
}

/* Bet just placed in the betslip (soccer). */
const SLIP_LEGS: Leg[] = [
  { pick: 'Arsenal', market: 'Match Result', event: 'Arsenal vs Chelsea', odds: '+120' },
  { pick: 'Over 2.5', market: 'Total Goals', event: 'Liverpool vs Man City', odds: '-110' },
  { pick: 'Real Madrid -1', market: 'Handicap', event: 'Real Madrid vs Getafe', odds: '+150' },
]

const SLIP_BET: SharedBet = {
  label: 'Parlay · 3 legs',
  odds: '+950',
  legs: SLIP_LEGS,
  stake: '$20.00',
  toWin: '$190.00',
  status: 'Pending',
  placed: 'Nov 9, 2026 · 6:02 PM',
  link: 'betonline.ag/sports/soccer?share=7Kq2xR&RAF=7NNSD1Q5',
}

const SLIP_PICKS: SoccerSlipPick[] = SLIP_LEGS.map((leg, i) => ({
  id: `share-pick-${i}`,
  label: leg.pick,
  odds: leg.odds,
  eventLabel: leg.event,
  market: leg.market,
}))

/* Draft legs for Bet History rows (the seed has no legs). Odds match the row's risk / to-win. */
const HISTORY_LEGS: Record<string, Leg[]> = {
  'bet-1': [
    { pick: 'Chiefs -10.5', market: 'Spread', event: 'Chiefs vs Raiders', odds: '-400' },
    { pick: 'Eagles ML', market: 'Moneyline', event: 'Eagles vs Giants', odds: '-350' },
    { pick: 'Bills -7', market: 'Spread', event: 'Bills vs Jets', odds: '-400' },
  ],
}

function betFromRow(row: BetHistoryRow): SharedBet {
  const legs =
    HISTORY_LEGS[row.id] ?? [{ pick: row.description, market: row.type, event: row.detail.comment, odds: '' }]
  return {
    label: legs.length > 1 ? `${row.type} · ${legs.length} legs` : row.type,
    odds: legs.length > 1 ? '+100' : legs[0].odds,
    legs,
    stake: row.risk,
    toWin: row.toWin,
    status: row.status,
    placed: row.detail.acceptedDate,
    /* Draft: NFL rows → /sports/football. Production derives the sport from the bet's legs. */
    link: `betonline.ag/sports/football?share=${row.detail.betId}&RAF=7NNSD1Q5`,
  }
}

/* ── Status badge (same tokens as Bet History) ─────────────────────────── */

function StatusPill({ status }: { status: BetStatus }) {
  return (
    <span
      className="inline-flex h-6 items-center rounded-full border px-2.5 text-xs font-medium"
      style={BET_STATUS_STYLE[status]}
    >
      {status}
    </span>
  )
}

/* ── The bet card (shared as image + link preview) ─────────────────────── */

function BetCard({ bet, compact = false }: { bet: SharedBet; compact?: boolean }) {
  const won = bet.status === 'Won'
  return (
    <article data-name="share-bet-card" className={cn(CARD, 'w-full overflow-hidden')}>
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <ShellWordmark />
        <StatusPill status={bet.status} />
      </header>

      <div className={cn('flex flex-col px-4', compact ? 'gap-2 py-3' : 'gap-3 py-4')}>
        <div className="flex items-baseline justify-between gap-3">
          <Typography as="p" shape="xs" weight="medium" className="text-muted-foreground">
            {bet.label}
          </Typography>
          <span className="text-sm font-semibold tabular-nums text-foreground">{bet.odds}</span>
        </div>
        <ul className={cn('flex flex-col', compact ? 'gap-1.5' : 'gap-2.5')}>
          {bet.legs.map((leg) => (
            <li key={leg.pick} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{leg.pick}</p>
                {compact ? null : (
                  <p className="truncate text-xs text-muted-foreground">
                    {leg.market} · {leg.event}
                  </p>
                )}
              </div>
              <span className="shrink-0 text-sm font-medium tabular-nums text-foreground">{leg.odds}</span>
            </li>
          ))}
        </ul>
      </div>

      <footer className="grid grid-cols-2 gap-3 border-t border-border bg-secondary/40 px-4 py-3">
        <div>
          <p className="text-xs text-muted-foreground">Stake</p>
          <p className="text-base font-semibold tabular-nums text-foreground">{bet.stake}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{won ? 'Won' : 'To win'}</p>
          <p className={cn('text-base font-semibold tabular-nums', won ? 'text-success' : 'text-foreground')}>
            {bet.toWin}
          </p>
        </div>
      </footer>
    </article>
  )
}

function BetCardSkeleton({ legs = 3 }: { legs?: number }) {
  return (
    <div className={cn(CARD, 'flex w-full flex-col gap-3 p-4')} aria-busy="true">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      {Array.from({ length: legs }, (_, i) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-3.5 w-10" />
        </div>
      ))}
      <Skeleton className="h-12 w-full" />
    </div>
  )
}

/* ── Share panel: preview + channels + link ────────────────────────────── */

const CHANNELS = [
  { id: 'x', label: 'X', icon: IconBrandX },
  { id: 'telegram', label: 'Telegram', icon: IconBrandTelegram },
  { id: 'whatsapp', label: 'WhatsApp', icon: IconBrandWhatsapp },
  { id: 'download', label: 'Save image', icon: IconDownload },
] as const

type ShareState = 'ready' | 'loading' | 'error'

function SharePanel({ bet, shareState }: { bet: SharedBet; shareState: ShareState }) {
  const [copied, setCopied] = useState(false)
  const disabled = shareState !== 'ready'

  return (
    <div data-name="share-bet-panel" className="flex flex-col gap-4">
      {shareState === 'loading' ? (
        <BetCardSkeleton legs={bet.legs.length} />
      ) : shareState === 'error' ? (
        <div className={cn(CARD, 'flex flex-col items-center gap-3 px-4 py-6 text-center')}>
          <p className="text-sm font-medium text-foreground">Couldn&apos;t create the share link.</p>
          <Button type="button" variant="secondary" className="h-9 gap-1.5 rounded-lg px-4">
            <IconRefresh className="size-4" stroke={2} aria-hidden />
            Retry
          </Button>
        </div>
      ) : (
        <BetCard bet={bet} compact />
      )}

      <div className="flex items-start justify-between gap-2">
        {CHANNELS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            disabled={disabled}
            className="group flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-secondary text-foreground transition-colors duration-200 group-hover:bg-accent group-active:scale-95">
              <Icon className="size-5" stroke={1.75} aria-hidden />
            </span>
            <span className="truncate text-xs text-muted-foreground">{label}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-input bg-popover p-1 pl-3">
        <IconLink className="size-4 shrink-0 text-muted-foreground" stroke={2} aria-hidden />
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
          {bet.link}
        </span>
        <Button
          type="button"
          variant="secondary"
          disabled={disabled}
          className="h-8 shrink-0 gap-1.5 rounded-md px-3"
          onClick={() => {
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1600)
          }}
        >
          {copied ? (
            <IconCheck className="size-4" stroke={2} aria-hidden />
          ) : (
            <IconCopy className="size-4" stroke={2} aria-hidden />
          )}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
    </div>
  )
}

/* ── View 1: real betslip on "Bets placed" + Share ─────────────────────── */

function SlipView({ initialStep, shareState }: { initialStep: 'success' | 'share'; shareState: ShareState }) {
  const [step, setStep] = useState(initialStep)
  return (
    <>
      <SoccerSportPage />
      <SoccerBetslip
        picks={SLIP_PICKS}
        onRemove={() => {}}
        onClear={() => {}}
        initialConfirmed={{ count: SLIP_PICKS.length, stake: 20, win: 190 }}
        onShare={() => setStep('share')}
        onShareBack={() => setStep('success')}
        shareStep={step === 'share' ? <SharePanel bet={SLIP_BET} shareState={shareState} /> : undefined}
      />
    </>
  )
}

/* ── View 2: Bet History, Share beside Print ───────────────────────────── */

function HistoryShareAction({
  row,
  menuOpen,
  shareState,
}: {
  row: BetHistoryRow
  menuOpen: boolean
  shareState: ShareState
}) {
  const [sheetOpen, setSheetOpen] = useState(menuOpen)
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    setIsDesktop(mq.matches)
    const on = () => setIsDesktop(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  if (row.status === 'Cancelled' || isDesktop === null) return null
  const bet = betFromRow(row)

  const trigger = (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      className="h-8 shrink-0 gap-1.5"
      onClick={(e) => {
        e.stopPropagation()
        if (!isDesktop) setSheetOpen(true)
      }}
    >
      <IconShare2 className="size-4" stroke={2} aria-hidden />
      Share
    </Button>
  )

  /* Mobile: native share sheet first; this bottom sheet is the fallback (betslip sheet chrome). */
  if (!isDesktop) {
    return (
      <>
        {trigger}
        {sheetOpen ? (
          <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              aria-label="Close"
              className="absolute inset-0 bg-black/60"
              onClick={() => setSheetOpen(false)}
            />
            <aside
              role="dialog"
              aria-label="Share bet"
              className="dark relative flex max-h-[85dvh] w-full flex-col overflow-hidden rounded-t-lg border border-b-0 border-border bg-popover text-popover-foreground shadow-lg"
            >
              <div className="flex justify-center px-4 pb-2 pt-3" aria-hidden>
                <span className="h-1 w-10 rounded-full bg-secondary" />
              </div>
              <div className="flex items-center gap-1 px-4 pb-2">
                <Typography as="span" shape="small" weight="semibold" className="flex-1">
                  Share bet
                </Typography>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setSheetOpen(false)}
                  className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-foreground"
                >
                  <IconX className="size-4" stroke={1.75} />
                </button>
              </div>
              <div className="mx-4 h-px shrink-0 bg-border" />
              <div className="overflow-y-auto px-4 pb-6 pt-4">
                <SharePanel bet={bet} shareState={shareState} />
              </div>
            </aside>
          </div>
        ) : null}
      </>
    )
  }

  return (
    <Popover defaultOpen={menuOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="center"
        side="left"
        sideOffset={12}
        collisionPadding={{ top: 80, bottom: 16, left: 16, right: 16 }}
        className="w-80 rounded-lg p-4"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-3 text-sm font-semibold text-foreground">Share bet</p>
        <SharePanel bet={bet} shareState={shareState} />
      </PopoverContent>
    </Popover>
  )
}

/* ── View 3: friend opens the link → sportsbook with the picks in the slip ─
   Chris, round 1: "they should land on sports with the bets already in the slip".
   No landing page. Real SoccerBetslip, opened on mount with the shared legs. */

type LandingState = 'open' | 'partial' | 'settled' | 'missing' | 'error'

function LandingView({ state }: { state: LandingState }) {
  const initial =
    state === 'open' ? SLIP_PICKS : state === 'partial' ? SLIP_PICKS.slice(1) : []
  const [picks, setPicks] = useState(initial)
  const notice =
    state === 'partial'
      ? "1 pick has started and wasn't added."
      : state === 'settled'
        ? 'This bet has settled.'
        : state === 'missing'
          ? "This bet isn't available."
          : state === 'error'
            ? "Couldn't load the shared picks."
            : undefined
  return (
    <>
      <SoccerSportPage />
      <SoccerBetslip
        picks={picks}
        onRemove={(id) => setPicks((p) => p.filter((x) => x.id !== id))}
        onClear={() => setPicks([])}
        initialOpen
        notice={notice}
        onNoticeRetry={state === 'error' ? () => {} : undefined}
      />
    </>
  )
}

/* ── Entry: picks the real section of the site per view ────────────────── */

const NAV_PATH: Record<string, string> = {
  slip: '/sports/soccer',
  history: '/account/bet-history',
  landing: '/sports/soccer',
}

export function ShareBetPrototype() {
  const params = useSearchParams()
  const rawView = params.get('view')
  const view =
    rawView === 'history' ? 'history' : rawView === 'landing' || rawView === 'public' ? 'landing' : 'slip'
  const shareParam = params.get('share')
  const shareState: ShareState = shareParam === 'loading' ? 'loading' : shareParam === 'error' ? 'error' : 'ready'

  let body: ReactNode
  if (view === 'history') {
    const menuOpen = params.get('menu') === 'open'
    body = (
      <BetHistoryPage
        defaultExpandedId="bet-1"
        expandedActions={(row) => (
          <HistoryShareAction row={row} menuOpen={menuOpen && row.id === 'bet-1'} shareState={shareState} />
        )}
      />
    )
  } else if (view === 'landing') {
    const s = params.get('state')
    const state: LandingState =
      s === 'partial' || s === 'settled' || s === 'missing' || s === 'error' ? s : 'open'
    body = <LandingView key={state} state={state} />
  } else {
    body = (
      <SlipView initialStep={params.get('step') === 'share' ? 'share' : 'success'} shareState={shareState} />
    )
  }

  return (
    <ShellNavPathProvider path={NAV_PATH[view]}>
      <ShellFrame>{body}</ShellFrame>
    </ShellNavPathProvider>
  )
}
