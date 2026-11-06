'use client'

import { useEffect, useRef, useState } from 'react'
import { IconTrophy, IconUsers } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { ShellFrame } from '@/components/site/shell-frame'
import { useShell } from '@/components/site/shell-context'
import { ORIGINALS_GAMES, type CasinoLobbyGame } from '@/lib/lumen/casino-lobby-catalog'
import { formatRaceCountdown } from '@/lib/lumen/daily-races'
import { cn } from '@/lib/utils'

/**
 * DRAFT — Recommendation "Casino Tournaments" (recommendations-2026-11-06).
 * Fills the dead "Tournaments" casino nav item (shell-nav.ts → /casino today).
 * Short, game-specific events: one rule, one pot, a live rank. Reuses the Daily Race
 * leaderboard recipe and the shell launcher.
 */

type Tournament = {
  id: string
  gameId: string
  name: string
  rule: string
  pot: string
  players: string
  endsIn: number
  joined?: { rank: number; best: string }
}

const TOURNAMENTS: Tournament[] = [
  { id: 'plinko-sprint', gameId: 'plinko', name: 'Plinko Sprint', rule: 'Highest single multiplier wins', pot: '$10,000', players: '2,318', endsIn: 1 * 3600 + 42 * 60 + 10, joined: { rank: 14, best: '41.2×' } },
  { id: 'mines-hour', gameId: 'mines', name: 'Mines Power Hour', rule: 'Most points from wins in 60 min', pot: '$2,500', players: '640', endsIn: 38 * 60 + 5 },
  { id: 'crash-climb', gameId: 'crash', name: 'Crash Climb', rule: 'Highest cash-out multiplier', pot: '$5,000', players: '1,105', endsIn: 5 * 3600 + 10 * 60 },
  { id: 'blackjack-streak', gameId: 'blackjack', name: 'Blackjack Streak', rule: 'Longest winning streak', pot: '$3,000', players: '412', endsIn: 9 * 3600 },
]

const TOP = [
  { rank: 1, user: 'Hidden', score: '388.0×', prize: '$2,500' },
  { rank: 2, user: 'Jims', score: '212.4×', prize: '$1,500' },
  { rank: 3, user: 'Moh81', score: '160.0×', prize: '$1,000' },
]

const TABS = ['Live', 'Upcoming', 'Finished'] as const

function gameFor(id: string): CasinoLobbyGame {
  return ORIGINALS_GAMES.find((g) => g.id.endsWith(id)) ?? ORIGINALS_GAMES[0]!
}

function useCountdown(start: number) {
  const [s, setS] = useState(start)
  useEffect(() => {
    const id = window.setInterval(() => setS((v) => Math.max(0, v - 1)), 1000)
    return () => window.clearInterval(id)
  }, [])
  return formatRaceCountdown(s)
}

function TournamentHeading({ t }: { t: Tournament }) {
  return (
    <>
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-success bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
        <span className="size-1.5 animate-pulse rounded-full bg-success motion-reduce:animate-none" aria-hidden />
        Live
      </span>
      <Typography as="h2" shape="h4" weight="semibold">{t.name}</Typography>
      <p className="text-sm text-muted-foreground">{t.rule}. Every $0.20+ round counts.</p>
    </>
  )
}

function FeaturedTournament({ t }: { t: Tournament }) {
  const { launchGame } = useShell()
  const btn = useRef<HTMLButtonElement>(null)
  const game = gameFor(t.gameId)
  const countdown = useCountdown(t.endsIn)

  return (
    <section
      data-name="tournament-featured"
      className="grid gap-4 rounded-lg border border-border bg-card p-4 shadow-sm lg:grid-cols-5 lg:p-5"
    >
      <div className="flex flex-col gap-3 lg:col-span-3 lg:flex-row lg:gap-4">
        <div className="flex gap-3 lg:contents">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={game.imageSrc} alt={game.title} className="h-28 w-20 shrink-0 rounded-lg object-cover lg:h-44 lg:w-32" />
          <div className="flex min-w-0 flex-col gap-2 lg:hidden">
            <TournamentHeading t={t} />
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="hidden flex-col gap-2 lg:flex">
            <TournamentHeading t={t} />
          </div>
          <div className="mt-1 grid grid-cols-3 gap-2">
            {[
              [t.pot, 'Prize pool'],
              [countdown, 'Ends in'],
              [`#${t.joined?.rank}`, 'Your rank'],
            ].map(([v, l]) => (
              <div key={l} className="rounded-md border border-border bg-secondary px-2.5 py-2">
                <p className="truncate text-sm font-semibold tabular-nums text-foreground lg:text-base">{v}</p>
                <p className="text-xs text-muted-foreground">{l}</p>
              </div>
            ))}
          </div>
          <Button
            ref={btn}
            type="button"
            className="mt-1 w-fit rounded-lg active:scale-95"
            onClick={() => launchGame(game, btn.current)}
          >
            Play {game.title}
          </Button>
        </div>
      </div>

      <div className="flex flex-col overflow-hidden rounded-lg border border-border lg:col-span-2">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
          <IconTrophy className="size-4 text-muted-foreground" aria-hidden />
          <p className="text-sm font-semibold text-foreground">Leaderboard</p>
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
            <IconUsers className="size-3.5" aria-hidden />
            {t.players}
          </span>
        </div>
        {TOP.map((r) => (
          <div key={r.rank} className="flex items-center gap-3 border-b border-border px-3 py-2 text-sm hover:!bg-surface-muted-3">
            <span className="w-6 font-semibold tabular-nums text-muted-foreground">{r.rank}</span>
            <span className="min-w-0 flex-1 truncate text-foreground">{r.user}</span>
            <span className="tabular-nums text-muted-foreground">{r.score}</span>
            <span className="w-16 text-right font-semibold tabular-nums text-foreground">{r.prize}</span>
          </div>
        ))}
        <div className="flex items-center gap-3 bg-secondary px-3 py-2 text-sm">
          <span className="w-6 font-semibold tabular-nums text-foreground">14</span>
          <span className="min-w-0 flex-1 truncate text-foreground">
            You <span className="text-muted-foreground">· 9.8× to top 10</span>
          </span>
          <span className="tabular-nums text-muted-foreground">41.2×</span>
          <span className="w-16 text-right font-semibold tabular-nums text-success">$40</span>
        </div>
      </div>
    </section>
  )
}

function TournamentCard({ t }: { t: Tournament }) {
  const { launchGame } = useShell()
  const btn = useRef<HTMLButtonElement>(null)
  const game = gameFor(t.gameId)
  const countdown = useCountdown(t.endsIn)

  return (
    <article className="flex gap-3 rounded-lg border border-border bg-card p-3 shadow-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={game.imageSrc} alt={game.title} className="h-24 w-16 shrink-0 rounded-md object-cover" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate font-semibold text-foreground">{t.name}</p>
        <p className="line-clamp-1 text-xs text-muted-foreground">{t.rule}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="font-semibold text-success">{t.pot}</span>
          <span className="font-mono tabular-nums">{countdown}</span>
          <span>Min $0.20</span>
        </div>
        <Button
          ref={btn}
          type="button"
          variant="secondary"
          size="sm"
          className="mt-auto w-fit rounded-lg active:scale-95"
          onClick={() => launchGame(game, btn.current)}
        >
          Join & Play
        </Button>
      </div>
    </article>
  )
}

function TournamentsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Live')
  const [featured, ...rest] = TOURNAMENTS

  return (
    <div data-name="casino-tournaments" className="w-full bg-background px-4 pb-14 pt-4 lg:px-6 lg:pt-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Typography as="h1" shape="h3" weight="semibold">Tournaments</Typography>
        <div role="tablist" aria-label="Tournament status" className="flex gap-1 border-b border-border">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn(
                'relative -mb-px border-b-2 px-3 pb-2.5 text-sm font-medium transition-colors',
                tab === t ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <FeaturedTournament t={featured!} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((t) => (
            <TournamentCard key={t.id} t={t} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function IdeaCasinoTournamentsPage() {
  return (
    <div data-prototype-lane="" className="min-h-svh bg-background">
      <ShellFrame>
        <TournamentsPage />
      </ShellFrame>
    </div>
  )
}
