'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  IconArrowsExchange,
  IconChevronLeft,
  IconChevronRight,
  IconCreditCard,
  IconHistory,
} from '@tabler/icons-react'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  useCarousel,
} from '@/components/ui/carousel'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Typography } from '@/components/ui/typography'
import {
  CASINO_TILE_H,
  CasinoGameTile,
} from '@/components/lumen/casino-game-tile'
import { FilterSelectBox } from '@/components/lumen/filter-select-box'
import { CasinoLobbyBannerRow } from '@/components/lumen/casino-lobby-banners'
import { CASINO_LOBBY_PROMO_BANNERS } from '@/lib/lumen/casino-lobby-promos'
import { useShell } from '@/components/site/shell-context'
import {
  DESK_PERIODS,
  deskBiggestLosses,
  deskBiggestWins,
  deskPnL,
  formatDeskMoney,
  formatDeskVolume,
  type DeskBiggestWin,
  type DeskPeriod,
} from '@/lib/lumen/account-desk'
import {
  BET_HISTORY_ROWS,
  BET_STATUS_STYLE,
  type BetStatus,
} from '@/lib/lumen/bet-history'
import {
  TRENDS_CHART_VARS,
  formatTrend,
  myTrendsShelves,
} from '@/lib/lumen/casino-trends'
import { PAYMENT_ROWS } from '@/lib/lumen/payments'
import { TRANSACTION_ROWS } from '@/lib/lumen/transactions'
import { cn } from '@/lib/utils'

const CARD =
  'rounded-lg border border-border bg-card shadow-[0_0_16px_rgba(0,0,0,0.06)]'

const ROW_HOVER = 'hover:!bg-surface-muted-3'

/** Same chrome as casino lobby / Trends shelves — square, secondary, desktop only. */
const CAROUSEL_ARROW =
  'inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-secondary p-0 text-foreground transition-colors hover:bg-muted disabled:opacity-45'

/**
 * Trading-desk style overview under My Account profile header.
 * Flat My Trends shelves (casino carousel chrome) + win/loss cards + activity previews.
 */
export function AccountDeskDashboard() {
  const { launchGame, startNavigating } = useShell()
  const [period, setPeriod] = useState<DeskPeriod>('today')
  const pnl = useMemo(() => deskPnL(period), [period])
  const wins = useMemo(() => deskBiggestWins(period), [period])
  const losses = useMemo(() => deskBiggestLosses(period), [period])
  const shelves = useMemo(() => myTrendsShelves(period), [period])
  const bets = useMemo(() => BET_HISTORY_ROWS.slice(0, 6), [])
  const txs = useMemo(() => TRANSACTION_ROWS.slice(0, 6), [])
  const pays = useMemo(() => PAYMENT_ROWS.slice(0, 6), [])

  return (
    <div
      data-name="module-account-desk"
      className="flex w-full flex-col gap-4"
    >
      <PnLStrip
        period={period}
        onPeriodChange={setPeriod}
        pnl={pnl}
      />

      {/* Flat shelves — no outer card; casino carousel arrows. */}
      <div className="flex flex-col gap-5 py-1" data-name="desk-my-trends">
        <h2 className="text-xl font-semibold leading-7 text-foreground lg:text-2xl lg:leading-8">
          My Trends
        </h2>
        {shelves.map((shelf) => (
          <DeskShelf
            key={shelf.id}
            title={shelf.title}
            rows={shelf.rows}
            onLaunch={launchGame}
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BiggestTable
          title="Biggest wins"
          rows={wins}
          tone="win"
          onLaunch={launchGame}
        />
        <BiggestTable
          title="Biggest losses"
          rows={losses}
          tone="loss"
          onLaunch={launchGame}
        />
      </div>

      {/* Promo carousel breaks up the dense table grid below. Promo cards only —
          VIP / Daily Races cards belong on the casino lobby, not the account desk. */}
      <CasinoLobbyBannerRow
        flush
        vip={false}
        dailyRaces={false}
        promos={CASINO_LOBBY_PROMO_BANNERS}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <MiniTable
          title="Bet History"
          href="/account/bet-history"
          icon={<IconHistory className="size-4" strokeWidth={1.5} />}
          onViewAll={startNavigating}
        >
          {bets.map((row) => (
            <MiniRow
              key={row.id}
              title={row.description}
              meta={row.type}
              value={row.status === 'Won' ? row.toWin : row.risk}
              valueClass={
                row.status === 'Won'
                  ? 'text-success'
                  : row.status === 'Lost'
                    ? 'text-destructive'
                    : undefined
              }
              status={row.status}
              statusStyle={BET_STATUS_STYLE[row.status as BetStatus]}
            />
          ))}
        </MiniTable>

        <MiniTable
          title="Transactions"
          href="/account/transactions"
          icon={<IconArrowsExchange className="size-4" strokeWidth={1.5} />}
          onViewAll={startNavigating}
        >
          {txs.map((row) => (
            <MiniRow
              key={row.id}
              title={row.description}
              meta={`${row.type} · ${row.date}`}
              value={formatDeskMoney(row.amount, true)}
              valueClass={row.amount > 0 ? 'text-success' : undefined}
              status={row.product}
            />
          ))}
        </MiniTable>

        <MiniTable
          title="Payments"
          href="/account/payments"
          icon={<IconCreditCard className="size-4" strokeWidth={1.5} />}
          onViewAll={startNavigating}
        >
          {pays.map((row) => (
            <MiniRow
              key={row.id}
              title={row.method}
              meta={`${row.type} · ${row.date}`}
              value={formatDeskMoney(row.totalAmount, true)}
              valueClass={row.totalAmount > 0 ? 'text-success' : undefined}
              status={row.detail.status}
              statusClass={
                row.detail.status === 'Pending'
                  ? 'text-warning'
                  : row.detail.status === 'Declined'
                    ? 'text-destructive'
                    : 'text-muted-foreground'
              }
            />
          ))}
        </MiniTable>
      </div>
    </div>
  )
}

function PnLStrip({
  period,
  onPeriodChange,
  pnl,
}: {
  period: DeskPeriod
  onPeriodChange: (p: DeskPeriod) => void
  pnl: ReturnType<typeof deskPnL>
}) {
  const plotRef = useRef<HTMLDivElement>(null)
  const [plotW, setPlotW] = useState(560)
  const [hover, setHover] = useState<number | null>(null)
  const positive = pnl.net >= 0

  useEffect(() => {
    const el = plotRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setPlotW(el.clientWidth || 560))
    ro.observe(el)
    setPlotW(el.clientWidth || 560)
    return () => ro.disconnect()
  }, [])

  const series = pnl.series
  const n = series.length
  const lo0 = Math.min(...series, 0)
  const hi0 = Math.max(...series, 0)
  const pad = (hi0 - lo0) * 0.14 || 40
  const lo = lo0 - pad
  const hi = hi0 + pad

  const H = 148
  const m = { t: 8, r: 8, b: 8, l: 8 }
  const pw = Math.max(40, plotW - m.l - m.r)
  const ph = H - m.t - m.b
  const x = (i: number) => m.l + (n < 2 ? 0 : (i / (n - 1)) * pw)
  const y = (v: number) => m.t + ph - ((v - lo) / (hi - lo)) * ph

  const tipI = hover ?? n - 1
  const tipV = series[tipI] ?? pnl.net
  const stroke = positive ? TRENDS_CHART_VARS[1] : TRENDS_CHART_VARS[0]

  let path = ''
  series.forEach((v, i) => {
    path += i === 0 ? `M${x(i)},${y(v)}` : `H${x(i)}V${y(v)}`
  })

  return (
    <section className={cn(CARD, 'overflow-hidden')} data-name="desk-pnl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5">
        <Typography as="h2" shape="h4" weight="semibold" className="text-base sm:text-lg">
          Performance
        </Typography>
        <FilterSelectBox
          label="Period"
          value={period}
          options={DESK_PERIODS.map((o) => ({ id: o.id, label: o.label }))}
          onChange={onPeriodChange}
          triggerClassName="w-[156px]"
        />
      </div>

      <div className="grid gap-5 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-end lg:gap-8">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Net P&L</p>
            <p
              className={cn(
                'mt-0.5 text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl',
                positive ? 'text-success' : 'text-destructive',
              )}
            >
              {formatDeskMoney(pnl.net, true)}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <StatChip label="Win rate" value={`${pnl.winRate}%`} />
            <StatChip label="Volume" value={formatDeskVolume(pnl.volume)} />
            <StatChip label="Sessions" value={String(pnl.sessions)} />
          </div>
        </div>

        <div ref={plotRef} className="min-w-0">
          <svg
            width={plotW}
            height={H}
            viewBox={`0 0 ${plotW} ${H}`}
            className="w-full overflow-visible"
            role="img"
            aria-label="Net P&L over the selected period"
            onPointerMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const px = e.clientX - rect.left
              const i = Math.round(((px - m.l) / pw) * (n - 1))
              setHover(Math.max(0, Math.min(n - 1, i)))
            }}
            onPointerLeave={() => setHover(null)}
          >
            <line
              x1={m.l}
              x2={m.l + pw}
              y1={y(0)}
              y2={y(0)}
              className="stroke-border"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <path
              d={path}
              fill="none"
              stroke={stroke}
              strokeWidth={2}
              strokeLinejoin="round"
            />
            <circle
              cx={x(tipI)}
              cy={y(tipV)}
              r={hover == null ? 3 : 4}
              fill={stroke}
            />
          </svg>
          {hover != null ? (
            <p className="mt-1 text-center text-[11px] tabular-nums text-muted-foreground">
              {formatDeskMoney(tipV, true)}
            </p>
          ) : (
            <p className="mt-1 h-[15px]" aria-hidden />
          )}
        </div>
      </div>
    </section>
  )
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary px-3 py-2.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  )
}

function BiggestTable({
  title,
  rows,
  tone,
  onLaunch,
}: {
  title: string
  rows: DeskBiggestWin[]
  tone: 'win' | 'loss'
  onLaunch: ReturnType<typeof useShell>['launchGame']
}) {
  return (
    <div className={cn(CARD, 'overflow-hidden')} data-name={`desk-${tone}s`}>
      <div className="border-b border-border px-4 py-3.5 sm:px-5">
        <Typography as="h2" shape="h4" weight="semibold" className="text-base sm:text-lg">
          {title}
        </Typography>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-11 pl-4 text-xs sm:pl-5">Game</TableHead>
            <TableHead className="h-11 text-xs">
              {tone === 'win' ? 'Payout' : 'Loss'}
            </TableHead>
            <TableHead className="hidden h-11 text-xs sm:table-cell">Multi</TableHead>
            <TableHead className="h-11 pr-4 text-right text-xs sm:pr-5">When</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              className={cn('border-border transition-colors', ROW_HOVER)}
            >
              <TableCell className="py-2.5 pl-4 sm:pl-5">
                <button
                  type="button"
                  className="flex max-w-full items-center gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={(e) => onLaunch(row.game, e.currentTarget)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={row.game.imageSrc}
                    alt=""
                    width={40}
                    height={54}
                    className="size-10 shrink-0 rounded-md object-cover"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {row.game.title}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {row.game.vendor}
                    </span>
                  </span>
                </button>
              </TableCell>
              <TableCell
                className={cn(
                  'py-2.5 tabular-nums font-medium',
                  tone === 'win' ? 'text-success' : 'text-destructive',
                )}
              >
                {formatDeskMoney(row.payout, true)}
              </TableCell>
              <TableCell className="hidden py-2.5 tabular-nums text-muted-foreground sm:table-cell">
                {row.multi.toFixed(1)}×
              </TableCell>
              <TableCell className="py-2.5 pr-4 text-right text-muted-foreground sm:pr-5">
                {row.when}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function MiniTable({
  title,
  href,
  icon,
  onViewAll,
  children,
}: {
  title: string
  href: string
  icon: ReactNode
  onViewAll: (href: string) => void
  children: ReactNode
}) {
  return (
    <div className={cn(CARD, 'flex flex-col overflow-hidden')} data-name={`desk-mini-${title}`}>
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-secondary text-muted-foreground">
            {icon}
          </span>
          <Typography as="h3" shape="h4" weight="semibold" className="truncate text-sm sm:text-base">
            {title}
          </Typography>
        </div>
        <Link
          href={href}
          className="shrink-0 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => onViewAll(href)}
        >
          View all
        </Link>
      </div>
      <ul className="flex flex-col divide-y divide-border">{children}</ul>
    </div>
  )
}

function MiniRow({
  title,
  meta,
  value,
  valueClass,
  status,
  statusStyle,
  statusClass,
}: {
  title: string
  meta: string
  value: string
  valueClass?: string
  status: string
  statusStyle?: { backgroundColor: string; borderColor: string; color: string }
  statusClass?: string
}) {
  return (
    <li className={cn('flex items-center gap-3 px-4 py-2.5 transition-colors', ROW_HOVER)}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{meta}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className={cn('text-sm font-medium tabular-nums text-foreground', valueClass)}>
          {value}
        </p>
        {statusStyle ? (
          <span
            className="mt-0.5 inline-flex rounded border px-1.5 py-px text-size-xxs font-medium leading-4"
            style={statusStyle}
          >
            {status}
          </span>
        ) : (
          <p className={cn('text-[11px] font-medium uppercase tracking-wide', statusClass ?? 'text-muted-foreground')}>
            {status}
          </p>
        )}
      </div>
    </li>
  )
}

function DeskShelf({
  title,
  rows,
  onLaunch,
}: {
  title: string
  rows: ReturnType<typeof myTrendsShelves>[number]['rows']
  onLaunch: ReturnType<typeof useShell>['launchGame']
}) {
  return (
    <section className="py-0.5">
      <Carousel opts={{ align: 'start', dragFree: true }} className="w-full">
        <DeskCarouselChrome title={title} />
        <CarouselContent className="!ml-0 gap-3 py-3">
          {rows.map((row) => (
            <CarouselItem
              key={`${title}-${row.game.id}`}
              className="basis-auto pl-0 first:pl-0 last:pr-0"
            >
              <div
                className="flex w-[152px] shrink-0 flex-col"
                style={{ minHeight: CASINO_TILE_H + 56 }}
              >
                <CasinoGameTile game={row.game} onLaunch={onLaunch} hideTitle />
                <p className="mt-2 truncate text-sm font-medium text-foreground">
                  {row.game.title}
                </p>
                <p className="text-xs tabular-nums text-foreground">{row.stat}</p>
                <div className="mt-0.5 flex items-center justify-between gap-1 text-[11px]">
                  <span className="truncate text-muted-foreground">{row.detail}</span>
                  <span
                    className={cn(
                      'shrink-0 tabular-nums font-medium',
                      row.trend > 0
                        ? 'text-success'
                        : row.trend < 0
                          ? 'text-destructive'
                          : 'text-muted-foreground',
                    )}
                  >
                    {formatTrend(row.trend)}
                  </span>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </section>
  )
}

/** Desktop arrows only — same as casino Trends / lobby shelves. */
function DeskCarouselChrome({ title }: { title: string }) {
  const { scrollPrev, scrollNext, canScrollPrev, canScrollNext } = useCarousel()

  return (
    <header className="mb-1 flex min-h-9 items-center justify-between gap-3">
      <Typography
        as="h3"
        shape="h4"
        weight="semibold"
        className="min-w-0 truncate text-sm sm:text-base"
      >
        {title}
      </Typography>
      <div className="hidden items-center gap-1 md:flex">
        <button
          type="button"
          aria-label="Previous"
          className={CAROUSEL_ARROW}
          disabled={!canScrollPrev}
          onClick={scrollPrev}
        >
          <IconChevronLeft className="size-4" strokeWidth={1.5} />
        </button>
        <button
          type="button"
          aria-label="Next"
          className={CAROUSEL_ARROW}
          disabled={!canScrollNext}
          onClick={scrollNext}
        >
          <IconChevronRight className="size-4" strokeWidth={1.5} />
        </button>
      </div>
    </header>
  )
}
