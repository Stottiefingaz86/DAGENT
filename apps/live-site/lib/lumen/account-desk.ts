import {
  ORIGINALS_GAMES,
  type CasinoLobbyGame,
} from '@/lib/lumen/casino-lobby-catalog'
import {
  TRENDS_PERIODS,
  type TrendsPeriod,
} from '@/lib/lumen/casino-trends'

export type DeskPeriod = TrendsPeriod

export const DESK_PERIODS = TRENDS_PERIODS

const PERIOD_MULT: Record<DeskPeriod, number> = {
  today: 1,
  week: 6.4,
  month: 28,
}

/** Stable pseudo-random — same desk figures across reloads. */
function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967296
}

export type DeskPnL = {
  net: number
  winRate: number
  volume: number
  sessions: number
  /** Cumulative net series for the step chart (oldest → newest). */
  series: number[]
}

/** Illustrative trading-desk P&L for the selected period. */
export function deskPnL(period: DeskPeriod): DeskPnL {
  const mult = PERIOD_MULT[period]
  const sign = hash(`desk:pnl:sign:${period}`) > 0.38 ? 1 : -1
  const mag = 180 + hash(`desk:pnl:mag:${period}`) * 2_400 * mult
  const net = Math.round(sign * mag * 100) / 100
  const winRate = Math.round((42 + hash(`desk:wr:${period}`) * 28) * 10) / 10
  const volume = Math.round((1_200 + hash(`desk:vol:${period}`) * 18_000) * mult)
  const sessions = Math.max(
    1,
    Math.round((3 + hash(`desk:sess:${period}`) * 14) * (period === 'today' ? 1 : mult * 0.35)),
  )

  const points = period === 'today' ? 24 : period === 'week' ? 28 : 30
  const series: number[] = []
  let cum = 0
  const step = net / points
  for (let i = 0; i < points; i++) {
    const noise = (hash(`desk:s:${period}:${i}`) - 0.48) * Math.abs(step) * 2.4
    cum += step + noise
    series.push(Math.round(cum * 100) / 100)
  }
  /* Snap last point to reported net so the chart matches the headline. */
  series[series.length - 1] = net
  return { net, winRate, volume, sessions, series }
}

export type DeskBiggestWin = {
  id: string
  game: CasinoLobbyGame
  payout: number
  multi: number
  /** Relative time label, e.g. "12m ago". */
  when: string
}

const WHEN_POOL = [
  '4m ago',
  '12m ago',
  '38m ago',
  '1h ago',
  '2h ago',
  '5h ago',
  'Yesterday',
  '2d ago',
] as const

/** Biggest wins list for the desk (demo seed). */
export function deskBiggestWins(period: DeskPeriod, limit = 6): DeskBiggestWin[] {
  const pool = ORIGINALS_GAMES.slice(0, 14)
  const mult = PERIOD_MULT[period]
  return [...pool]
    .sort(
      (a, b) =>
        hash(`${b.id}:bw:${period}`) - hash(`${a.id}:bw:${period}`),
    )
    .slice(0, limit)
    .map((game, i) => {
      const payout = Math.round(
        (80 + hash(`${game.id}:pay:${period}`) * 4_200 * Math.sqrt(mult)) * 100,
      ) / 100
      const multi =
        Math.round((1.4 + hash(`${game.id}:mx:${period}`) * 48) * 10) / 10
      return {
        id: `${period}-win-${game.id}`,
        game,
        payout,
        multi,
        when: WHEN_POOL[i % WHEN_POOL.length]!,
      }
    })
    .sort((a, b) => b.payout - a.payout)
}

/** Biggest losses — realistic drawdowns next to the wins card. */
export function deskBiggestLosses(period: DeskPeriod, limit = 6): DeskBiggestWin[] {
  const pool = ORIGINALS_GAMES.slice(0, 14)
  const mult = PERIOD_MULT[period]
  return [...pool]
    .sort(
      (a, b) =>
        hash(`${b.id}:bl:${period}`) - hash(`${a.id}:bl:${period}`),
    )
    .slice(0, limit)
    .map((game, i) => {
      const payout = Math.round(
        -(120 + hash(`${game.id}:loss:${period}`) * 3_800 * Math.sqrt(mult)) * 100,
      ) / 100
      const multi =
        Math.round((0.2 + hash(`${game.id}:lmx:${period}`) * 0.7) * 10) / 10
      return {
        id: `${period}-loss-${game.id}`,
        game,
        payout,
        multi,
        when: WHEN_POOL[(i + 3) % WHEN_POOL.length]!,
      }
    })
    .sort((a, b) => a.payout - b.payout)
}

export function formatDeskMoney(value: number, signed = false) {
  const abs = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  if (!signed) return `$${abs}`
  if (value > 0) return `+$${abs}`
  if (value < 0) return `−$${abs}`
  return `$${abs}`
}

export function formatDeskVolume(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`
  return `$${n.toLocaleString('en-US')}`
}
