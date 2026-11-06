import { NextResponse, type NextRequest } from 'next/server'

/**
 * Local demo (:3000) blocks design-lane + unmerged product routes.
 * Prototype lane (`PROTOTYPE_LANE=1` / `:3001`) and hosted Vercel serve `/prototype/*`.
 */
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const pathLower = path.toLowerCase()
  const isPrototypeLane = process.env.PROTOTYPE_LANE === '1'
  const isHosted = Boolean(process.env.VERCEL || process.env.VERCEL_ENV)

  /* Local :3000 only — hosted Vercel serves prototypes on the same origin. */
  if (
    !isPrototypeLane &&
    !isHosted &&
    (pathLower.startsWith('/prototype') ||
      pathLower.startsWith('/promotions/races'))
  ) {
    return NextResponse.rewrite(new URL('/404', request.url))
  }

  if (pathLower.startsWith('/lumen')) {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-lumen-gallery', '1')
    return NextResponse.next({
      request: { headers: requestHeaders },
    })
  }

  if (!pathLower.startsWith('/designagent')) {
    return NextResponse.next()
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-design-agent', '1')
  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}

export const config = {
  matcher: [
    '/designagent',
    '/designagent/:path*',
    '/Designagent',
    '/Designagent/:path*',
    '/lumen',
    '/lumen/:path*',
    '/prototype',
    '/prototype/:path*',
    '/promotions/races',
    '/promotions/races/:path*',
  ],
}
