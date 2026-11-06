'use client'

import { useEffect, useRef, useState } from 'react'
import { IconCheck, IconLock } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { HomepageLobby } from '@/components/lumen/homepage-lobby-page'
import { ShellFrame } from '@/components/site/shell-frame'
import { useShell } from '@/components/site/shell-context'
import { ORIGINALS_GAMES } from '@/lib/lumen/casino-lobby-catalog'
import { formatRaceCountdown } from '@/lib/lumen/daily-races'
import { cn } from '@/lib/utils'

/**
 * DRAFT — Recommendation "First-week path" (recommendations-2026-11-06).
 * Seven daily steps for a new player, built from the Missions model + claim beat we ship
 * in VIP Hub. Sits at the top of the logged-in homepage for days 1–7 only.
 */

type DayState = 'claimed' | 'today' | 'locked'

type Day = {
  day: number
  task: string
  reward: string
  state: DayState
  imageSrc: string
}

const DAYS: Day[] = [
  { day: 1, task: 'Place your first casino bet', reward: '20 Free Spins', state: 'claimed', imageSrc: '/games/originals/plinko.png' },
  { day: 2, task: 'Play 50 spins on Chicken', reward: '$5 Cash', state: 'today', imageSrc: '/games/originals/chicken.png' },
  { day: 3, task: 'Try a live table', reward: '$5 Cash', state: 'locked', imageSrc: '/games/originals/blackjack.png' },
  { day: 4, task: 'Join the Daily Race', reward: '2× race points', state: 'locked', imageSrc: '/games/originals/dice.png' },
  { day: 5, task: 'Win on any Original', reward: '30 Free Spins', state: 'locked', imageSrc: '/games/originals/mines.png' },
  { day: 6, task: 'Wager $50 on slots', reward: '10% Rakeback boost', state: 'locked', imageSrc: '/games/originals/keno.png' },
  { day: 7, task: 'Finish the week', reward: '$25 Cash', state: 'locked', imageSrc: '/games/originals/wheel.png' },
]

const TODAY_PROGRESS = { current: 32, target: 50 }

function FirstWeekPath() {
  const { launchGame } = useShell()
  const [remaining, setRemaining] = useState(14 * 3600 + 22 * 60 + 10)
  const playRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const id = window.setInterval(() => setRemaining((s) => Math.max(0, s - 1)), 1000)
    return () => window.clearInterval(id)
  }, [])

  const pct = Math.round((TODAY_PROGRESS.current / TODAY_PROGRESS.target) * 100)
  const chicken = ORIGINALS_GAMES.find((g) => g.id.includes('chicken')) ?? ORIGINALS_GAMES[0]

  return (
    <section
      data-name="first-week-path"
      aria-label="Your first week"
      className="rounded-lg border border-border bg-card p-4 shadow-sm lg:p-5"
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Your first week · Day 2 of 7</p>
          <h2 className="text-xl font-semibold leading-7 text-foreground">Play daily, unlock $35 + 50 spins</h2>
        </div>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Today ends in{' '}
          <span className="font-mono font-semibold tabular-nums text-foreground">
            {formatRaceCountdown(remaining)}
          </span>
        </p>
      </div>

      {/* Swipe only on touch; no edge chevrons (MOBILE_CAROUSELS.md). */}
      <div className="-mx-4 snap-x snap-mandatory overflow-x-auto px-4 pb-1 lg:mx-0 lg:overflow-visible lg:px-0">
      <ol className="flex w-max items-start gap-2 lg:grid lg:w-full lg:grid-cols-7 lg:items-stretch">
        {DAYS.map((d) => (
          <li
            key={d.day}
            aria-current={d.state === 'today' ? 'step' : undefined}
            className={cn(
              'flex w-40 shrink-0 snap-start flex-col gap-2 rounded-lg border p-3 lg:w-auto',
              d.state === 'today' ? 'border-primary bg-secondary' : 'border-border bg-secondary',
              d.state === 'locked' && 'opacity-70',
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Day {d.day}</span>
              {d.state === 'claimed' ? (
                <span className="flex size-5 items-center justify-center rounded-full bg-success text-success-foreground" aria-label="Claimed">
                  <IconCheck className="size-3" strokeWidth={3} />
                </span>
              ) : d.state === 'locked' ? (
                <IconLock className="size-4 text-muted-foreground" aria-label="Locked" />
              ) : (
                <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">Today</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={d.imageSrc} alt="" className="h-12 w-9 shrink-0 rounded-md object-cover" />
              <p className="line-clamp-2 text-xs leading-4 text-foreground">{d.task}</p>
            </div>
            <p className={cn('text-sm font-semibold', d.state === 'claimed' ? 'text-muted-foreground line-through' : 'text-success')}>
              {d.reward}
            </p>
            {d.state === 'today' ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Spins</span>
                  <span className="tabular-nums">{TODAY_PROGRESS.current} / {TODAY_PROGRESS.target}</span>
                </div>
                <div
                  className="h-1.5 w-full overflow-hidden rounded-full bg-background"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Day 2 progress"
                >
                  <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
                <Button
                  ref={playRef}
                  type="button"
                  className="h-8 rounded-lg active:scale-95"
                  onClick={() => launchGame(chicken, playRef.current)}
                >
                  Play Chicken
                </Button>
              </div>
            ) : null}
          </li>
        ))}
      </ol>
      </div>
    </section>
  )
}

export default function IdeaFirstWeekPathPage() {
  return (
    <div data-prototype-lane="" className="min-h-svh bg-background">
      <ShellFrame>
        <div className="px-4 pt-4 lg:px-6">
          <FirstWeekPath />
        </div>
        <HomepageLobby />
      </ShellFrame>
    </div>
  )
}
