/** PropShopX sport-specific page — Soccer // Games demo seed. */

export type SoccerMode = 'games' | 'outrights' | 'leagues'

export type SoccerOdds = {
  id: string
  label: string
  odds: string
}

export type SoccerEvent = {
  id: string
  home: string
  away: string
  homeAbbr: string
  awayAbbr: string
  /** Pre-match kickoff label, or live clock. */
  when: string
  live?: boolean
  score?: [number, number]
  picks: SoccerOdds[]
  /** Extra desktop columns beyond the mobile row. */
  desktopPicks?: SoccerOdds[]
}

export type SoccerLeagueSection = {
  id: string
  name: string
  icon: string
  events: SoccerEvent[]
  moreCount: number
}

export type SoccerQuickLink = {
  id: string
  label: string
  icon: string
  /** When set, tile soft-navs out of soccer (e.g. casino cross-sell). */
  href?: string
  /** Full game art in the icon slot (no white logo plate). */
  art?: boolean
}

export type SoccerRailItem = {
  id: string
  label: string
  /** Tabler icon key — mono sport rail. */
  icon: SoccerRailIcon
  href: string
}

export type SoccerRailIcon =
  | 'bets'
  | 'soccer'
  | 'football'
  | 'basketball'
  | 'tennis'
  | 'baseball'
  | 'hockey'
  | 'mma'

export type SoccerCountryGroup = {
  id: string
  name: string
  flag: string
  leagues: { id: string; name: string; icon?: string }[]
}

export const SOCCER_MODES: { id: SoccerMode; label: string }[] = [
  { id: 'games', label: 'Games' },
  { id: 'outrights', label: 'Outrights' },
  { id: 'leagues', label: 'All Leagues' },
]

/** Until other sport lobbies ship, every rail item lands on soccer content. */
export const SOCCER_SPORT_RAIL: SoccerRailItem[] = [
  { id: 'my-bets', label: 'My Bets', icon: 'bets', href: '/sports/soccer' },
  { id: 'soccer', label: 'Soccer', icon: 'soccer', href: '/sports/soccer' },
  { id: 'football', label: 'Football', icon: 'football', href: '/sports/soccer' },
  { id: 'basketball', label: 'Basketball', icon: 'basketball', href: '/sports/soccer' },
  { id: 'tennis', label: 'Tennis', icon: 'tennis', href: '/sports/soccer' },
  { id: 'baseball', label: 'Baseball', icon: 'baseball', href: '/sports/soccer' },
  { id: 'hockey', label: 'Hockey', icon: 'hockey', href: '/sports/soccer' },
  { id: 'mma', label: 'MMA', icon: 'mma', href: '/sports/soccer' },
]

/** PropShopX quicklinks — Figma-exported marks (`public/shell/figma/soccer/icon-*.svg`). */
export const SOCCER_QUICK_LINKS: SoccerQuickLink[] = [
  { id: 'all', label: 'All Soccer', icon: '' },
  { id: 'epl', label: 'Premier League', icon: '/shell/figma/soccer/icon-epl.svg' },
  { id: 'laliga', label: 'La Liga', icon: '/shell/figma/soccer/icon-laliga.svg' },
  { id: 'seriea', label: 'Serie A', icon: '/shell/figma/soccer/icon-seriea.svg' },
  { id: 'bundesliga', label: 'Bundesliga', icon: '/shell/figma/soccer/icon-bundesliga.svg' },
  { id: 'ligue1', label: 'Ligue 1', icon: '/shell/figma/soccer/icon-ligue1.svg' },
  /* Casino cross-sell — DVD / poster tiles (152×207 art), not league chips. */
  {
    id: 'live',
    label: 'Live Roulette',
    icon: '/casino/tiles/live/dealer-red.png',
    href: '/casino/live',
    art: true,
  },
  {
    id: 'blackjack',
    label: 'Blackjack',
    icon: '/games/originals/blackjack.png',
    href: '/casino/category/blackjack',
    art: true,
  },
]

/** League page mode pills — Games | All Leagues (Figma 355:27661). */
export const SOCCER_LEAGUE_MODES: { id: SoccerMode; label: string }[] = [
  { id: 'games', label: 'Games' },
  { id: 'leagues', label: 'All Leagues' },
]

export function isSoccerLeagueView(leagueFilter: string) {
  return leagueFilter !== 'all'
}

export const SOCCER_COUNTRY_OPTIONS = [
  { id: 'all', label: 'All Countries' },
  { id: 'england', label: 'England' },
  { id: 'spain', label: 'Spain' },
  { id: 'italy', label: 'Italy' },
  { id: 'germany', label: 'Germany' },
  { id: 'france', label: 'France' },
  { id: 'usa', label: 'USA' },
] as const

export const SOCCER_LEAGUE_OPTIONS = [
  { id: 'all', label: 'All Leagues', country: 'all' },
  { id: 'epl', label: 'Premier League', country: 'england' },
  { id: 'championship', label: 'Championship', country: 'england' },
  { id: 'laliga', label: 'La Liga', country: 'spain' },
  { id: 'seriea', label: 'Serie A', country: 'italy' },
  { id: 'bundesliga', label: 'Bundesliga', country: 'germany' },
  { id: 'ligue1', label: 'Ligue 1', country: 'france' },
  { id: 'mls', label: 'MLS', country: 'usa' },
  { id: 'ucl', label: 'Champions League', country: 'all' },
] as const

const eplPicks = (
  prefix: string,
  homeAbbr: string,
  awayAbbr: string,
  ml: [string, string, string],
  spread: [string, string],
  total: [string, string],
  half: [string, string, string],
): { picks: SoccerOdds[]; desktopPicks: SoccerOdds[] } => ({
  picks: [
    { id: `${prefix}-h`, label: homeAbbr, odds: ml[0] },
    { id: `${prefix}-d`, label: 'TIE', odds: ml[1] },
    { id: `${prefix}-a`, label: awayAbbr, odds: ml[2] },
    { id: `${prefix}-s`, label: spread[0], odds: spread[1] },
  ],
  desktopPicks: [
    { id: `${prefix}-h`, label: homeAbbr, odds: ml[0] },
    { id: `${prefix}-d`, label: 'TIE', odds: ml[1] },
    { id: `${prefix}-a`, label: awayAbbr, odds: ml[2] },
    { id: `${prefix}-sh`, label: spread[0], odds: spread[1] },
    { id: `${prefix}-sa`, label: `+${spread[0].replace('-', '')}`, odds: '+120' },
    { id: `${prefix}-to`, label: `O ${total[0]}`, odds: total[1] },
    { id: `${prefix}-tu`, label: `U ${total[0]}`, odds: '+112' },
    { id: `${prefix}-1h`, label: homeAbbr, odds: half[0] },
    { id: `${prefix}-1d`, label: 'TIE', odds: half[1] },
    { id: `${prefix}-1a`, label: awayAbbr, odds: half[2] },
  ],
})

const cov = eplPicks('cov', 'COV', 'BRI', ['+209', '+290', '+120'], ['-1.5', '-136'], ['3', '-128'], [
  '+138',
  '+165',
  '+210',
])
const mun = eplPicks('mun', 'MUN', 'MCI', ['+340', '+280', '-125'], ['+1.5', '-110'], ['3', '-115'], [
  '+280',
  '+190',
  '+110',
])
const lee = eplPicks('lee', 'LEE', 'NEW', ['+195', '+240', '+145'], ['-0.5', '+105'], ['2.5', '-120'], [
  '+165',
  '+155',
  '+180',
])
const bre = eplPicks('bre', 'BRE', 'CHE', ['+310', '+265', '-110'], ['+1', '-115'], ['2.5', '-108'], [
  '+250',
  '+170',
  '+125',
])
const tot = eplPicks('tot', 'TOT', 'AVL', ['+155', '+230', '+175'], ['-0.5', '-105'], ['2.5', '-112'], [
  '+140',
  '+150',
  '+195',
])

export const SOCCER_GAME_SECTIONS: SoccerLeagueSection[] = [
  {
    id: 'epl',
    name: 'Premier League',
    icon: '/banners/sports_league/prem.svg',
    moreCount: 3,
    events: [
      {
        id: 'cov-bri',
        home: 'Coventry City',
        away: 'Brighton & Hove Albion',
        homeAbbr: 'COV',
        awayAbbr: 'BRI',
        when: "45+2'",
        live: true,
        score: [1, 1],
        ...cov,
      },
      {
        id: 'mun-mci',
        home: 'Manchester United',
        away: 'Manchester City',
        homeAbbr: 'MUN',
        awayAbbr: 'MCI',
        when: 'Sun 13 Sep, 3:30pm',
        ...mun,
      },
      {
        id: 'lee-new',
        home: 'Leeds United',
        away: 'Newcastle United',
        homeAbbr: 'LEE',
        awayAbbr: 'NEW',
        when: 'Sun 13 Sep, 4:00pm',
        ...lee,
      },
      {
        id: 'bre-che',
        home: 'Brentford',
        away: 'Chelsea',
        homeAbbr: 'BRE',
        awayAbbr: 'CHE',
        when: 'Sun 13 Sep, 4:30pm',
        ...bre,
      },
      {
        id: 'tot-avl',
        home: 'Tottenham Hotspur',
        away: 'Aston Villa',
        homeAbbr: 'TOT',
        awayAbbr: 'AVL',
        when: 'Mon 14 Sep, 8:00pm',
        ...tot,
      },
    ],
  },
  {
    id: 'championship',
    name: 'Championship',
    icon: '/shell/figma/soccer/soccer-ball.svg',
    moreCount: 0,
    events: [
      {
        id: 'lei-nor',
        home: 'Leicester City',
        away: 'Norwich City',
        homeAbbr: 'LEI',
        awayAbbr: 'NOR',
        when: 'Sat 12 Sep, 3:00pm',
        ...eplPicks('lei', 'LEI', 'NOR', ['-125', '+260', '+340'], ['-0.5', '-110'], ['2.5', '-115'], [
          '-105',
          '+170',
          '+280',
        ]),
      },
      {
        id: 'sou-ips',
        home: 'Southampton',
        away: 'Ipswich Town',
        homeAbbr: 'SOU',
        awayAbbr: 'IPS',
        when: 'Sat 12 Sep, 5:30pm',
        ...eplPicks('sou', 'SOU', 'IPS', ['+145', '+230', '+190'], ['-0.5', '+105'], ['2.5', '-108'], [
          '+130',
          '+155',
          '+210',
        ]),
      },
    ],
  },
  {
    id: 'laliga',
    name: 'La Liga',
    icon: '/banners/sports_league/laliga-mark.svg',
    moreCount: 3,
    events: [
      {
        id: 'rma-bar',
        home: 'Real Madrid',
        away: 'Barcelona',
        homeAbbr: 'RMA',
        awayAbbr: 'BAR',
        when: 'Sun 13 Sep, 8:00pm',
        ...eplPicks('rma', 'RMA', 'BAR', ['+165', '+250', '+155'], ['-0.5', '-110'], ['3', '-118'], [
          '+145',
          '+160',
          '+185',
        ]),
      },
      {
        id: 'atm-sev',
        home: 'Atlético Madrid',
        away: 'Sevilla',
        homeAbbr: 'ATM',
        awayAbbr: 'SEV',
        when: 'Sun 13 Sep, 3:15pm',
        ...eplPicks('atm', 'ATM', 'SEV', ['-140', '+260', '+380'], ['-1', '-105'], ['2.5', '-115'], [
          '-115',
          '+175',
          '+320',
        ]),
      },
      {
        id: 'vil-bet',
        home: 'Villarreal',
        away: 'Real Betis',
        homeAbbr: 'VIL',
        awayAbbr: 'BET',
        when: 'Sat 12 Sep, 5:30pm',
        ...eplPicks('vil', 'VIL', 'BET', ['+125', '+230', '+210'], ['-0.5', '+100'], ['2.5', '-108'], [
          '+130',
          '+150',
          '+220',
        ]),
      },
    ],
  },
]

/** Map quick-link ids → game section ids (leagues without seed keep empty). */
export function soccerSectionsForFilter(filterId: string): SoccerLeagueSection[] {
  if (filterId === 'all') return SOCCER_GAME_SECTIONS
  return SOCCER_GAME_SECTIONS.filter((s) => s.id === filterId)
}

export const SOCCER_OUTRIGHTS: { id: string; name: string; odds: string }[] = [
  { id: 'epl-winner', name: 'Premier League Winner', odds: 'See markets' },
  { id: 'ucl-winner', name: 'UEFA Champions League Winner', odds: 'See markets' },
  { id: 'wc-winner', name: 'World Cup 2026 Winner', odds: 'See markets' },
  { id: 'golden-boot', name: 'Premier League Golden Boot', odds: 'See markets' },
]

export const SOCCER_COUNTRY_GROUPS: SoccerCountryGroup[] = [
  {
    id: 'top',
    name: 'Top Leagues',
    flag: '/sports_icons/soccer.svg',
    leagues: [
      { id: 'epl', name: 'Premier League', icon: '/banners/sports_league/prem.svg' },
      { id: 'laliga', name: 'La Liga', icon: '/banners/sports_league/laliga-mark.svg' },
      { id: 'ligue1', name: 'Ligue 1' },
      { id: 'seriea', name: 'Serie A' },
      { id: 'bundesliga', name: 'Bundesliga' },
      { id: 'ucl', name: 'UEFA Champions League', icon: '/banners/sports_league/champions.svg' },
    ],
  },
  {
    id: 'england',
    name: 'England',
    flag: '/sports_icons/soccer.svg',
    leagues: [
      { id: 'epl', name: 'Premier League', icon: '/banners/sports_league/prem.svg' },
      { id: 'championship', name: 'Championship' },
      { id: 'league-one', name: 'League One' },
      { id: 'league-two', name: 'League Two' },
    ],
  },
  { id: 'argentina', name: 'Argentina', flag: '/sports_icons/soccer.svg', leagues: [] },
  { id: 'belgium', name: 'Belgium', flag: '/sports_icons/soccer.svg', leagues: [] },
  { id: 'brazil', name: 'Brazil', flag: '/sports_icons/soccer.svg', leagues: [] },
  { id: 'france', name: 'France', flag: '/sports_icons/soccer.svg', leagues: [] },
  { id: 'germany', name: 'Germany', flag: '/sports_icons/soccer.svg', leagues: [] },
  { id: 'italy', name: 'Italy', flag: '/sports_icons/soccer.svg', leagues: [] },
  { id: 'spain', name: 'Spain', flag: '/sports_icons/soccer.svg', leagues: [] },
  { id: 'usa', name: 'USA', flag: '/sports_icons/soccer.svg', leagues: [{ id: 'mls', name: 'MLS', icon: '/banners/sports_league/mls.svg' }] },
]

export const DESKTOP_MARKET_HEADERS = [
  '3-Way Regulation',
  'Spread',
  'Total',
  '1H Moneyline',
] as const
