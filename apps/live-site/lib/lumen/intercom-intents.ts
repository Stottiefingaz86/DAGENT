/**
 * Fin-style keyword intents for the mock Intercom → product tour demo.
 * Not NLP — phrase/keyword checks only.
 */

export type IntercomTourIntent = 'rakeback' | 'daily_race'

export type IntercomTourDefinition = {
  id: IntercomTourIntent
  /** CSS selector for the spotlight target. */
  selector: string
  title: string
  body: string
  ctaLabel: string
  /** VIP Hub tab to open when the tour CTA fires. */
  vipHubTab: 'VIP' | '$25k Daily Race'
}

export const INTERCOM_TOURS: Record<IntercomTourIntent, IntercomTourDefinition> = {
  rakeback: {
    id: 'rakeback',
    selector: '[data-shell-vip]',
    title: 'Your rakeback lives here',
    body: 'Rewards and rakeback are in VIP Hub. Tap the crown icon in the nav to claim and track them.',
    ctaLabel: 'Open VIP Hub',
    vipHubTab: 'VIP',
  },
  daily_race: {
    id: 'daily_race',
    selector: '[data-shell-vip]',
    title: 'Daily Race standings',
    body: 'Your race position is under VIP Hub → Races. Tap the crown icon to jump there.',
    ctaLabel: 'Open VIP Hub',
    vipHubTab: '$25k Daily Race',
  },
}

/**
 * Match a user chat message to a product-tour intent.
 * Returns null when Fin should reply with a fallback tip instead.
 */
export function matchIntent(text: string): IntercomTourIntent | null {
  const t = text.trim().toLowerCase()
  if (!t) return null

  const mentionsRace =
    /\bdaily\s+race\b/.test(t) ||
    /\brace\s+position\b/.test(t) ||
    /\bmy\s+position\b/.test(t) ||
    /\bleaderboard\b/.test(t) ||
    (/\brace\b/.test(t) && /\bwhere\b|\bposition\b|\bstanding/.test(t))

  if (mentionsRace) return 'daily_race'

  if (
    /\brake\s*back\b/.test(t) ||
    /\brakeback\b/.test(t) ||
    /\bwhere\b.*\breward/.test(t) ||
    /\bmy\s+reward/.test(t) ||
    /\brewards?\b/.test(t)
  ) {
    return 'rakeback'
  }

  return null
}

export const INTERCOM_FALLBACK_REPLY =
  'I can show you where rakeback rewards or Daily Race standings live — try asking “where is my rakeback reward” or “what’s my position on daily race”.'
