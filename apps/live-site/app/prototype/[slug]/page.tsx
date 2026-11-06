'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { DailyRacesPage } from '@/components/lumen/daily-races-page'
import {
  EXPANDING_BANNERS_SLUG,
  ExpandingBannersPrototype,
} from '@/components/lumen/expanding-banner-row-prototype'
import { PrototypeInitiativeFallback } from '@/components/lumen/prototype-initiative-fallback'
import { VipBenefitsPrototypePage } from '@/components/lumen/vip-benefits-prototype-page'
import {
  SHELL_NAV_REFRESH_SLUG,
  ShellNavRefreshPrototype,
} from '@/components/lumen/shell-nav-refresh-prototype'
import { ShellFrame } from '@/components/site/shell-frame'
import {
  looksLikeBenefitsInitiative,
  prototypeEntry,
  prototypeLabel,
} from '@/lib/agent/prototype-registry'
import type { AgentJob } from '@/lib/agent/types'

/**
 * Design-lane preview — not the demo product nav.
 * Hosted: same origin. Local: :3001 with PROTOTYPE_LANE=1.
 */
export default function PrototypePage() {
  const params = useParams()
  const slug = String(params.slug ?? '')
  const entry = prototypeEntry(slug)
  const [job, setJob] = useState<AgentJob | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(`/api/agent/brd/${encodeURIComponent(slug)}`)
        if (!res.ok) return
        const data = (await res.json()) as { job?: AgentJob }
        if (!cancelled && data.job) setJob(data.job)
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slug])

  const body = (() => {
    if (slug === '001-daily-races-page') return <DailyRacesPage />
    if (slug === EXPANDING_BANNERS_SLUG) {
      return (
        <Suspense fallback={null}>
          <ExpandingBannersPrototype />
        </Suspense>
      )
    }
    if (looksLikeBenefitsInitiative(slug, job?.title, job?.brief)) {
      return <VipBenefitsPrototypePage />
    }
    if (job) return <PrototypeInitiativeFallback job={job} />
    return (
      <div className="px-6 py-16 text-center text-sm text-muted-foreground">
        Loading prototype for <code className="text-foreground">{slug}</code>…
      </div>
    )
  })()

  // No lane bar above the shell (Chris, Nov 2026): the prototype must look exactly like the real site.
  return (
    <div data-prototype-lane="" className="min-h-svh bg-background">
      {slug === SHELL_NAV_REFRESH_SLUG ? (
        <ShellNavRefreshPrototype />
      ) : (
        <ShellFrame>{body}</ShellFrame>
      )}
    </div>
  )
}
