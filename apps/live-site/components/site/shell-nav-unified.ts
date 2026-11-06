import {
  ORIGINALS_GAMES,
  type CasinoLobbyGame,
} from '@/lib/lumen/casino-lobby-catalog'
import type { ShellIconName } from './shell-icons'
import { SPORTS_HOME_HREF, type ShellNavAction } from './shell-nav'

/**
 * Unified sidebar tree — job screenshot-1793961160095-0 (prototype lane).
 * Order: switch → race widget → quick links → groups → utilities.
 * Rainbet structure, BetOnline skin. Demo nav (`navForProduct`) is untouched.
 */

export type UnifiedNavItem = {
  label: string
  href: string
  /** Omitted = text-only row (Language / Live Support until Lumen glyphs land). */
  icon?: ShellIconName
  iconSrc?: string
  action?: ShellNavAction | 'open-intercom'
  /** Launch this game directly (Originals rows). */
  game?: CasinoLobbyGame
  subtitle?: string
  live?: boolean
  trailing?: ShellIconName
}

export type UnifiedGroupId = 'casino' | 'originals' | 'sports' | 'poker' | 'promotions'

export type UnifiedNavGroup = {
  id: UnifiedGroupId
  label: string
  icon: ShellIconName
  items: UnifiedNavItem[]
}

export const PRODUCT_SWITCH = [
  { id: 'casino', label: 'Casino', href: '/casino', icon: 'dice' },
  { id: 'sports', label: 'Sports', href: SPORTS_HOME_HREF, icon: 'football' },
] as const satisfies ReadonlyArray<{
  id: 'casino' | 'sports'
  label: string
  href: string
  icon: ShellIconName
}>

export const UNIFIED_QUICK_LINKS: UnifiedNavItem[] = [
  { label: 'Home', href: '/', icon: 'home' },
  { label: 'Favorites', href: '/casino/category/favourites', icon: 'favorite' },
  {
    label: 'Recently Played',
    href: '/casino',
    icon: 'lastGame',
    action: 'launch-last-game',
  },
  { label: 'New Releases', href: '/casino/category/new', icon: 'trends' },
  { label: 'Play Random', href: '/casino', icon: 'random', action: 'launch-random' },
]

const ORIGINALS_IN_NAV = ['plinko', 'mines', 'dice', 'crash', 'blackjack'] as const

export const UNIFIED_GROUPS: UnifiedNavGroup[] = [
  {
    id: 'casino',
    label: 'Casino',
    icon: 'library',
    items: [
      { label: 'Casino Lobby', href: '/casino', icon: 'library' },
      { label: 'Popular Games', href: '/casino/category/popular', icon: 'popular' },
      { label: 'Slots', href: '/casino/slots', icon: 'slots' },
      { label: 'Live Casino', href: '/casino/live', icon: 'live' },
      { label: 'Table Games', href: '/casino/table-games', icon: 'table' },
      { label: 'Video Poker', href: '/casino/video-poker', icon: 'videoPoker' },
      { label: 'Specialty Games', href: '/casino/specialty', icon: 'specialty' },
      { label: 'Virtuals', href: '/casino/virtual-sports', icon: 'virtuals' },
      { label: 'Trends', href: '/casino/trends', icon: 'trends' },
    ],
  },
  {
    id: 'originals',
    label: 'Originals',
    icon: 'puzzle',
    items: [
      ...ORIGINALS_IN_NAV.map((id) => {
        const game = ORIGINALS_GAMES.find((g) => g.id === id)!
        return {
          label: game.title,
          href: '/casino/category/originals',
          iconSrc: game.imageSrc,
          game,
        } satisfies UnifiedNavItem
      }),
      { label: 'All Originals', href: '/casino/category/originals', icon: 'spade' },
    ],
  },
  {
    id: 'sports',
    label: 'Sports',
    icon: 'football',
    items: [
      { label: 'Sports Home', href: SPORTS_HOME_HREF, icon: 'house' },
      { label: 'Live Betting', href: SPORTS_HOME_HREF, icon: 'broadcast', live: true },
      { label: 'My Bets', href: SPORTS_HOME_HREF, icon: 'ticket' },
      { label: 'Odds Boosters', href: SPORTS_HOME_HREF, icon: 'rocket' },
      { label: 'Soccer', href: '/sports/soccer', icon: 'soccer' },
      { label: 'Basketball', href: SPORTS_HOME_HREF, icon: 'star' },
      { label: 'Football', href: SPORTS_HOME_HREF, icon: 'star' },
      { label: 'Racebook', href: SPORTS_HOME_HREF, icon: 'trophy' },
      { label: 'Esports', href: SPORTS_HOME_HREF, icon: 'desktop' },
    ],
  },
  {
    id: 'poker',
    label: 'Poker',
    icon: 'diamond',
    items: [
      { label: 'Play Online', href: '/poker#poker-start', icon: 'play' },
      { label: 'Download', href: '/poker#poker-download', icon: 'download' },
      { label: 'Features', href: '/poker#poker-features', icon: 'diamond' },
      { label: 'Integrity', href: '/poker#poker-integrity', icon: 'shield' },
    ],
  },
  {
    id: 'promotions',
    label: 'Promotions',
    icon: 'promos',
    items: [
      { label: 'All Promotions', href: '/promotions', icon: 'megaphone' },
      { label: 'My Bonus', href: '/promotions/my-bonus', icon: 'bonus' },
      { label: 'Daily Race', href: '/promotions/races', icon: 'trophy' },
      { label: 'Contests', href: '/promotions/contest', icon: 'contests' },
      { label: 'Refer A Friend', href: '/promotions/refer-a-friend', icon: 'refer' },
    ],
  },
]

export const UNIFIED_UTILITIES: UnifiedNavItem[] = [
  {
    label: 'VIP Hub',
    href: '#vip-hub',
    icon: 'vip',
    trailing: 'external',
    action: 'open-vip-hub',
  },
  /* Text-only until Lumen ships headset / globe glyphs (component brief). */
  { label: 'Live Support', href: '#support', action: 'open-intercom' },
  { label: 'Language: English', href: '#language' },
]

/** Which product the switch shows for a path. */
export function switchProductForPath(path: string): 'casino' | 'sports' {
  return path.startsWith('/sports') ? 'sports' : 'casino'
}

/** Group that starts open for a path. */
export function groupForPath(path: string): UnifiedGroupId | null {
  if (path.startsWith('/casino/category/originals')) return 'originals'
  if (path.startsWith('/casino')) return 'casino'
  if (path.startsWith('/sports')) return 'sports'
  if (path.startsWith('/poker')) return 'poker'
  if (path.startsWith('/promotions')) return 'promotions'
  return null
}

/** Active row for a path — exact match wins, then prefix on group rows. */
export function unifiedItemActive(item: UnifiedNavItem, path: string): boolean {
  if (item.action || item.game) return false
  if (item.href.startsWith('#')) return false
  if (item.href === '/') return path === '/'
  if (item.href === '/casino') return path === '/casino'
  if (item.href === SPORTS_HOME_HREF && item.label !== 'Sports Home') return false
  if (item.href.includes('#')) return false
  return path === item.href || path.startsWith(`${item.href}/`)
}
