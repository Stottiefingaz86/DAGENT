'use client'

import { useCallback, useState } from 'react'
import { CasinoLobby } from '@/components/lumen/casino-lobby-page'
import { CasinoLiveLobby } from '@/components/lumen/casino-live-page'
import { CasinoSlotsLobby } from '@/components/lumen/casino-slots-page'
import { CasinoSpecialtyLobby } from '@/components/lumen/casino-specialty-page'
import { CasinoTableGamesLobby } from '@/components/lumen/casino-table-games-page'
import { CasinoTrendsLobby } from '@/components/lumen/casino-trends-page'
import { CasinoVideoPokerLobby } from '@/components/lumen/casino-video-poker-page'
import { CasinoVirtualSportsLobby } from '@/components/lumen/casino-virtual-sports-page'
import { CasinoWallpaperPage } from '@/components/lumen/casino-wallpaper-page'
import { ContestsLobbyPage } from '@/components/lumen/contests-lobby-page'
import { DailyRacesPage } from '@/components/lumen/daily-races-page'
import { HomepageLobby } from '@/components/lumen/homepage-lobby-page'
import { MyBonusPage } from '@/components/lumen/my-bonus-page'
import { PokerLandingPage } from '@/components/lumen/poker-landing-page'
import { PromotionsLobbyPage } from '@/components/lumen/promotions-lobby-page'
import { ReferAFriendPage } from '@/components/lumen/refer-a-friend-page'
import { SoccerSportPage } from '@/components/lumen/soccer-sport-page'
import { ShellFrame } from '@/components/site/shell-frame'
import { ShellNavVariantProvider } from '@/components/site/shell-nav-variant'
import { getCategoryWallpaper } from '@/lib/lumen/casino-wallpaper'
import { scrollShellToId } from '@/lib/lumen/shell-scroll'

export const SHELL_NAV_REFRESH_SLUG = 'screenshot-1793961160095-0'

/** Existing page modules for a simulated route — same components the real routes render. */
function PageForPath({ path }: { path: string }) {
  const [route] = path.split('#')
  if (route === '/') return <HomepageLobby />
  if (route === '/casino/slots') return <CasinoSlotsLobby />
  if (route === '/casino/live') return <CasinoLiveLobby />
  if (route === '/casino/table-games') return <CasinoTableGamesLobby />
  if (route === '/casino/video-poker') return <CasinoVideoPokerLobby />
  if (route === '/casino/specialty') return <CasinoSpecialtyLobby />
  if (route === '/casino/virtual-sports') return <CasinoVirtualSportsLobby />
  if (route === '/casino/trends') return <CasinoTrendsLobby />
  if (route.startsWith('/casino/category/')) {
    const config = getCategoryWallpaper(route.replace('/casino/category/', ''))
    if (config) return <CasinoWallpaperPage config={config} fallbackHref="/casino" />
    return <CasinoLobby />
  }
  if (route.startsWith('/casino')) return <CasinoLobby />
  if (route.startsWith('/sports')) return <SoccerSportPage />
  if (route.startsWith('/poker')) return <PokerLandingPage />
  if (route === '/promotions/my-bonus') return <MyBonusPage />
  if (route === '/promotions/races') return <DailyRacesPage />
  if (route === '/promotions/contest') return <ContestsLobbyPage />
  if (route === '/promotions/refer-a-friend') return <ReferAFriendPage />
  if (route.startsWith('/promotions')) return <PromotionsLobbyPage />
  return <CasinoLobby />
}

/**
 * Prototype — shell side-nav refresh (Rainbet structure, Lumen skin).
 * Real ShellFrame with the `unified` nav variant. Routes are simulated in place
 * so the preview never falls back onto demo chrome. Starts on the casino lobby.
 */
export function ShellNavRefreshPrototype() {
  const [path, setPath] = useState('/casino')

  const navigate = useCallback((href: string) => {
    setPath(href)
    const hash = href.split('#')[1]
    if (hash) {
      /* Poker section anchors — wait for the page to mount, then scroll the shell. */
      window.setTimeout(() => scrollShellToId(hash), 60)
      return
    }
    document.getElementById('shell-scroll')?.scrollTo({ top: 0 })
  }, [])

  return (
    <ShellNavVariantProvider variant="unified" path={path} navigate={navigate} showRaceWidget>
      <ShellFrame>
        <div key={path} data-prototype-path={path}>
          <PageForPath path={path} />
        </div>
      </ShellFrame>
    </ShellNavVariantProvider>
  )
}
