import { DailyRacesSkeleton } from '@/components/lumen/daily-races-skeleton'
import { ShellFrame } from '@/components/site/shell-frame'

export default function Loading() {
  return (
    <ShellFrame skeleton>
      <DailyRacesSkeleton />
    </ShellFrame>
  )
}
