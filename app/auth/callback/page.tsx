'use client'

import { Suspense, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function CallbackHandler() {
  const router = useRouter()

  useEffect(() => {
    async function handleCallback() {
      let session = null

      const { data } = await supabase.auth.getSession()
      session = data.session

      if (!session) {
        const hash = window.location.hash.substring(1)
        const params = new URLSearchParams(hash)
        const accessToken = params.get('access_token')
        if (accessToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: params.get('refresh_token') || '',
          })
          const { data: refreshed } = await supabase.auth.getSession()
          session = refreshed.session
        }
      }

      if (!session) {
        router.replace('/login?error=no_session')
        return
      }

      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1'
        const res = await fetch(`${baseUrl}/auth/supabase`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken: session.access_token }),
        })

        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          router.replace(`/login?error=${body?.error?.message || 'exchange_failed'}`)
          return
        }

        const result = await res.json()

        document.cookie = `access_token=${result.accessToken}; path=/; SameSite=Lax; max-age=${60 * 60 * 8}`
        if (result.refreshToken) {
          document.cookie = `refresh_token=${result.refreshToken}; path=/; SameSite=Lax; max-age=${60 * 60 * 24 * 7}`
        }

        await supabase.auth.signOut()

        if (result.needsProfile) {
          router.replace('/complete-profile')
        } else {
          router.replace('/dashboard')
        }
      } catch {
        router.replace('/login?error=server_error')
      }
    }

    handleCallback()
  }, [router])

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-sm)',
      color: 'var(--color-neutral-900)',
    }}>
      Signing you in...
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--text-sm)',
        color: 'var(--color-neutral-900)',
      }}>
        Signing you in...
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  )
}
