import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { isPlatformAdminEmail } from '@/lib/saas/platform-admin'
import {
  evaluateSubscriptionAccess,
  isSubscriptionExemptPath,
} from '@/lib/saas/subscription-access'

export async function middleware(request: NextRequest) {
  // Produção atrás do proxy Coolify/Traefik: se a conexão original foi HTTP,
  // força HTTPS (certificado Let's Encrypt no domínio público).
  const forwardedProto = request.headers.get('x-forwarded-proto')
  if (
    process.env.NODE_ENV === 'production' &&
    forwardedProto === 'http' &&
    request.headers.get('host')
  ) {
    const httpsUrl = request.nextUrl.clone()
    httpsUrl.protocol = 'https:'
    return NextResponse.redirect(httpsUrl, 308)
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // getUser() transparently refreshes an expired access token, which
  // ROTATES the refresh token and writes the new cookies onto
  // `supabaseResponse` via setAll() above. Any response we return in
  // place of `supabaseResponse` (every redirect / JSON branch below)
  // is a fresh object that does NOT carry those Set-Cookie headers, so
  // the rotated token never reaches the browser. The next request then
  // replays the old, now-consumed refresh token, the refresh fails, and
  // the session wedges — the user gets a broken reload after idling and
  // can only recover by manually clearing cookies (issue #288). Copy the
  // refreshed cookies onto whatever response we hand back to fix that.
  const withRefreshedCookies = <T extends NextResponse>(response: T): T => {
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie)
    })
    return response
  }

  // Auth pages - redirect to dashboard if already logged in.
  if (user && (
    request.nextUrl.pathname === '/login' ||
    request.nextUrl.pathname === '/signup' ||
    request.nextUrl.pathname === '/forgot-password'
  )) {
    const url = request.nextUrl.clone()
    const inviteToken = request.nextUrl.searchParams.get('invite')
    if (
      inviteToken &&
      (request.nextUrl.pathname === '/login' ||
        request.nextUrl.pathname === '/signup')
    ) {
      url.pathname = `/join/${encodeURIComponent(inviteToken)}`
      url.search = ''
    } else {
      url.pathname = '/dashboard'
      url.search = ''
    }
    return withRefreshedCookies(NextResponse.redirect(url))
  }

  const protectedPaths = [
    '/dashboard',
    '/inbox',
    '/contacts',
    '/pipelines',
    '/broadcasts',
    '/automations',
    '/settings',
    '/flows',
    '/agents',
    '/notifications',
    '/platform',
    '/campaign',
    '/billing',
  ]
  if (!user && protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return withRefreshedCookies(NextResponse.redirect(url))
  }

  // Painel plataforma: só PLATFORM_ADMIN_EMAILS
  const isPlatformPath =
    request.nextUrl.pathname.startsWith('/platform') ||
    request.nextUrl.pathname.startsWith('/api/platform')
  if (user && isPlatformPath && !isPlatformAdminEmail(user.email)) {
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return withRefreshedCookies(
        NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      )
    }
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return withRefreshedCookies(NextResponse.redirect(url))
  }

  // Sprint 1: bloqueio comercial
  if (
    user &&
    !isPlatformAdminEmail(user.email) &&
    !isSubscriptionExemptPath(request.nextUrl.pathname) &&
    (protectedPaths.some((p) => request.nextUrl.pathname.startsWith(p)) ||
      request.nextUrl.pathname.startsWith('/api/'))
  ) {
    // Webhooks e crons públicos não passam por sessão de usuário
    if (
      request.nextUrl.pathname.includes('/webhook') ||
      request.nextUrl.pathname.startsWith('/api/public') ||
      request.nextUrl.pathname.startsWith('/api/cep')
    ) {
      return supabaseResponse
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('account_id')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.account_id) {
      const { data: account } = await supabase
        .from('accounts')
        .select('subscription_status, trial_ends_at')
        .eq('id', profile.account_id)
        .maybeSingle()

      if (account) {
        const access = evaluateSubscriptionAccess({
          status: account.subscription_status,
          trialEndsAt: account.trial_ends_at,
        })
        if (!access.allowed) {
          if (request.nextUrl.pathname.startsWith('/api/')) {
            return withRefreshedCookies(
              NextResponse.json(
                {
                  error: 'Assinatura inativa',
                  reason: access.reason,
                  code: 'subscription_blocked',
                },
                { status: 402 },
              ),
            )
          }
          const url = request.nextUrl.clone()
          url.pathname = '/billing/blocked'
          url.search = `?reason=${encodeURIComponent(access.reason)}`
          return withRefreshedCookies(NextResponse.redirect(url))
        }
      }
    }
  }

  if (!user && request.nextUrl.pathname.startsWith('/api/whatsapp/') &&
      !request.nextUrl.pathname.includes('/webhook')) {
    return withRefreshedCookies(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
