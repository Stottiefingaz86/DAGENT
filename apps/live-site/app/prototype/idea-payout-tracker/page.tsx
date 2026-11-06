'use client'

import { IconCheck, IconCopy, IconBell } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { TransactionsPage } from '@/components/lumen/transactions-page'
import { ShellFrame } from '@/components/site/shell-frame'
import { cn } from '@/lib/utils'

/**
 * DRAFT — Recommendation "Live payout tracker" (recommendations-2026-11-06).
 * Withdrawal status card above the real Transactions page. Mirrors the deposit tracker
 * stages we already ship (waiting → detected → confirming → confirmed) for money going out.
 */

type StepState = 'done' | 'current' | 'next'

const STEPS: { label: string; time: string; state: StepState }[] = [
  { label: 'Requested', time: '2:14 PM', state: 'done' },
  { label: 'Approved', time: '2:31 PM', state: 'done' },
  { label: 'Sent', time: '~15 min', state: 'current' },
  { label: 'Arrived', time: 'By 3:05 PM', state: 'next' },
]

function PayoutTracker() {
  return (
    <section
      data-name="payout-tracker"
      aria-label="Withdrawal status"
      className="rounded-lg border border-border bg-card p-4 shadow-sm lg:p-5"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-xs font-medium text-muted-foreground">Withdrawal · Bitcoin</p>
          <p className="text-2xl font-semibold leading-8 tabular-nums text-foreground">$1,250.00</p>
          <p className="text-sm text-muted-foreground">
            On its way. Expected by <span className="font-medium text-foreground">3:05 PM</span>.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-warning bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">
            <span className="size-1.5 animate-pulse rounded-full bg-warning motion-reduce:animate-none" aria-hidden />
            Sending
          </span>
          <Button type="button" variant="outline" size="sm" className="gap-1.5 rounded-lg">
            <IconCopy className="size-3.5" aria-hidden />
            Copy TX ID
          </Button>
          <Button type="button" variant="outline" size="sm" className="gap-1.5 rounded-lg">
            <IconBell className="size-3.5" aria-hidden />
            Notify me
          </Button>
        </div>
      </div>

      <ol className="mt-5 grid grid-cols-4 gap-2" aria-label="Withdrawal steps">
        {STEPS.map((step, i) => (
          <li key={step.label} className="flex min-w-0 flex-col gap-2" aria-current={step.state === 'current' ? 'step' : undefined}>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                  step.state === 'done' && 'border-success bg-success text-success-foreground',
                  step.state === 'current' && 'border-warning bg-warning/10 text-warning',
                  step.state === 'next' && 'border-border bg-secondary text-muted-foreground',
                )}
                aria-hidden
              >
                {step.state === 'done' ? <IconCheck className="size-3.5" strokeWidth={3} /> : i + 1}
              </span>
              {i < STEPS.length - 1 ? (
                <span
                  className={cn('h-0.5 flex-1 rounded-full', step.state === 'done' ? 'bg-success' : 'bg-secondary')}
                  aria-hidden
                />
              ) : null}
            </div>
            <div className="min-w-0">
              <p className={cn('truncate text-sm font-medium', step.state === 'next' ? 'text-muted-foreground' : 'text-foreground')}>
                {step.label}
              </p>
              <p className="truncate text-xs text-muted-foreground">{step.time}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

export default function IdeaPayoutTrackerPage() {
  return (
    <div data-prototype-lane="" className="min-h-svh bg-background">
      <ShellFrame>
        <div className="px-4 pt-4 lg:px-6 lg:pt-6">
          <PayoutTracker />
        </div>
        <TransactionsPage />
      </ShellFrame>
    </div>
  )
}
