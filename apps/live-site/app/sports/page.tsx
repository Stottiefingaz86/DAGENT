'use client'

import { SoccerSportPage } from '@/components/lumen/soccer-sport-page'
import { ShellFrame } from '@/components/site/shell-frame'

/** Sports Home → soccer lobby until other sport pages ship. */
export default function Page() {
  return (
    <ShellFrame>
      <SoccerSportPage />
    </ShellFrame>
  )
}
