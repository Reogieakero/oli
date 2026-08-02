'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Card, CardBody } from '@/components/ui/Card/Card'
import { LoadingOverlay } from '@/components/ui/LoadingOverlay/LoadingOverlay'
import { usePageTitle } from '@/lib/usePageTitle'
import { supabase } from '@/lib/supabase'
import styles from './StudentLogin.module.css'

const GOOGLE_ICON = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
)

function StudentLoginContent() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  usePageTitle('Student Login')

  const rawError = searchParams.get('error')
  const ignoredErrors = ['no_session', 'exchange_failed', 'server_error']
  const errorMessage = rawError && !ignoredErrors.includes(rawError) ? rawError : null

  async function handleGoogleSignIn() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setLoading(false)
    }
  }

  return (
    <LoadingOverlay visible={loading} message="Redirecting to Google..." fullscreen>
      <div className={styles.page}>
        <div className={styles.brandMark}>
          Liberalis
        </div>

      <Card className={styles.card}>
        <CardBody className={styles.cardBody}>
            <div className={styles.header}>
              <h1 className={styles.title}>Student Login</h1>
            <p className={styles.subtitle}>Sign in with your Google account to access your portal</p>
          </div>

          {errorMessage && (
            <div className={styles.errorBanner} role="alert">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            className={styles.googleBtn}
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            {GOOGLE_ICON}
            Sign in with Google
          </button>

          <div className={styles.dividerRow}>
            <span className={styles.dividerLine} />
            <span className={styles.dividerText}>New here?</span>
            <span className={styles.dividerLine} />
          </div>

          <p className={styles.infoText}>
            Sign in with Google for the first time and you will be guided to complete your student profile before accessing the portal.
          </p>

          <hr className={styles.divider} />

          <div className={styles.footer}>
            <Link href="/" className={styles.backLink}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
              </svg>
              Back to Landing Page
            </Link>
          </div>
        </CardBody>
      </Card>
      </div>
    </LoadingOverlay>
  )
}

export default function StudentLoginPage() {
  return (
    <Suspense fallback={null}>
      <StudentLoginContent />
    </Suspense>
  )
}
