/** Daily Races — VIP Hub race status + leaderboard (demo seed). */

export type DailyRaceStatus = {
  position: string
  wagered: string
  prize: string
  /** Seconds remaining until race reset (demo clock). */
  endsInSeconds: number
}

export type DailyRaceLeaderboardRow = {
  id: string
  rank: number
  /** Display name; null = privacy-hidden. */
  player: string | null
  /** Total wagered in the race (USD). */
  wageredUsd: number
  /** Prize share for this place (USD). */
  prizeUsd: number
  /** Highlight as the signed-in player. */
  isYou?: boolean
}

/** Match lobby Daily Races banner defaults. */
export const DAILY_RACE_STATUS: DailyRaceStatus = {
  position: '3rd',
  wagered: '$80.000',
  prize: '$160.000',
  /* ~6h 54m 31s — ticks live in the hub. */
  endsInSeconds: 6 * 3600 + 54 * 60 + 31,
}

/** Demo board — enough rows to paginate (10 per page). */
export const DAILY_RACE_LEADERBOARD: DailyRaceLeaderboardRow[] = [
  { id: 'r1', rank: 1, player: null, wageredUsd: 209_200, prizeUsd: 4_000 },
  { id: 'r2', rank: 2, player: 'Jims', wageredUsd: 184_750, prizeUsd: 2_500 },
  {
    id: 'r3',
    rank: 3,
    player: 'google_player',
    wageredUsd: 80_000,
    prizeUsd: 160,
    isYou: true,
  },
  { id: 'r4', rank: 4, player: 'Moh81', wageredUsd: 71_050, prizeUsd: 100 },
  { id: 'r5', rank: 5, player: null, wageredUsd: 58_400, prizeUsd: 75 },
  { id: 'r6', rank: 6, player: 'klmills96', wageredUsd: 49_280, prizeUsd: 50 },
  { id: 'r7', rank: 7, player: null, wageredUsd: 41_200, prizeUsd: 35 },
  { id: 'r8', rank: 8, player: 'fjlsdalfkdshakl', wageredUsd: 32_450, prizeUsd: 25 },
  { id: 'r9', rank: 9, player: 'acehigh22', wageredUsd: 24_100, prizeUsd: 15 },
  { id: 'r10', rank: 10, player: null, wageredUsd: 18_500, prizeUsd: 10 },
  { id: 'r11', rank: 11, player: 'spinqueen', wageredUsd: 16_200, prizeUsd: 0 },
  { id: 'r12', rank: 12, player: null, wageredUsd: 14_800, prizeUsd: 0 },
  { id: 'r13', rank: 13, player: 'riverboat', wageredUsd: 12_400, prizeUsd: 0 },
  { id: 'r14', rank: 14, player: 'nx_edge', wageredUsd: 11_050, prizeUsd: 0 },
  { id: 'r15', rank: 15, player: null, wageredUsd: 9_800, prizeUsd: 0 },
  { id: 'r16', rank: 16, player: 'colddeck', wageredUsd: 8_200, prizeUsd: 0 },
  { id: 'r17', rank: 17, player: 'parlaypete', wageredUsd: 7_100, prizeUsd: 0 },
  { id: 'r18', rank: 18, player: null, wageredUsd: 5_900, prizeUsd: 0 },
  { id: 'r19', rank: 19, player: 'lucky_lane', wageredUsd: 4_400, prizeUsd: 0 },
  { id: 'r20', rank: 20, player: 'betbot_x', wageredUsd: 3_100, prizeUsd: 0 },
]

export const DAILY_RACE_PAGE_SIZE = 10

export const DAILY_RACE_HOW_IT_WORKS = {
  title: 'How the $25k Daily Race works',
  body: 'Wager on casino games to climb the board. The race resets every day. Top places take a share of the $25k prize pool — paid in cash.',
}

export function formatRaceWagered(usd: number) {
  return `$${usd.toLocaleString('en-US')} wagered`
}

export function formatRaceCountdown(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(h)} : ${pad(m)} : ${pad(sec)}`
}

export function formatRaceMoney(usd: number) {
  return `$${usd.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}
