'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { apiClient, ApiError } from '@/lib/apiClient'
import { usePageTitle } from '@/lib/usePageTitle'
import { ToastProvider } from '@/components/ui/Toast/Toast'
import { Spinner } from '@/components/ui/Spinner/Spinner'
import { ConstellationBackground } from '@/components/ConstellationBackground/ConstellationBackground'
import { ProfileSetup } from './components/ProfileSetup'
import styles from './layout.module.css'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/attendance', label: 'Attendance' },
  { href: '/events', label: 'Events' },
  { href: '/announcements', label: 'Announcements' },
  { href: '/documents', label: 'Documents' },
  { href: '/balances', label: 'Balances' },
  { href: '/profile', label: 'Profile' },
]

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/attendance': 'Attendance',
  '/events': 'Events',
  '/announcements': 'Announcements',
  '/documents': 'Documents',
  '/feedback': 'Feedback',
  '/balances': 'Balances',
  '/profile': 'Profile',
  '/faq': 'FAQ',
  '/sanctions': 'Sanctions',
}

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [authed, setAuthed] = useState(false)
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const pageTitle = useMemo(() => {
    if (!pathname) return undefined
    const exact = PAGE_TITLES[pathname]
    if (exact) return exact
    const segment = pathname.split('/')[1]
    return segment ? PAGE_TITLES[`/${segment}`] : undefined
  }, [pathname])
  usePageTitle(pageTitle)

  useEffect(() => {
    const token = document.cookie.match(/(?:^|;\s*)access_token=([^;]*)/)?.[1]
    if (!token) {
      router.replace('/login')
      return
    }
    setAuthed(true)
    apiClient<{ profileComplete: boolean }>('/students/me', { authenticated: true })
      .then((res) => setProfileComplete(res.profileComplete))
      .catch((err) => {
        if (err instanceof ApiError && (err.statusCode === 401 || err.statusCode === 403 || err.statusCode === 404)) {
          document.cookie = 'access_token=; path=/; max-age=0'
          document.cookie = 'refresh_token=; path=/; max-age=0'
          router.replace(`/login?error=${encodeURIComponent(err.statusCode === 403 ? err.message : 'Session expired. Please sign in again.')}`)
          return
        }
        setProfileComplete(false)
      })
  }, [router])

  useEffect(() => {
    if (menuOpen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prev
      }
    }
  }, [menuOpen])

  if (!authed) return null
  if (profileComplete === null) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={32} />
      </div>
    )
  }
  if (!profileComplete) {
    return (
      <ToastProvider>
        <ProfileSetup onComplete={() => setProfileComplete(true)} />
      </ToastProvider>
    )
  }

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <ToastProvider>
      <div className={`${styles.layout} ${menuOpen ? styles.menuOpen : ''}`}>
        <ConstellationBackground />
        <nav className={styles.nav}>
          <div className={styles.navInner}>
            <Link href="/dashboard" className={styles.brand}>
              <span className={styles.brandName}>Liberalis</span>
            </Link>
            <div className={styles.desktopNav}>
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.navItem} ${isActive(item.href) ? styles.navItemActive : ''}`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <button className={styles.menuBtn} onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {menuOpen ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></> : <><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" /></>}
              </svg>
            </button>
          </div>
          {menuOpen && (
            <div className={styles.mobileNav}>
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.mobileNavItem} ${isActive(item.href) ? styles.mobileNavItemActive : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </nav>
        <main className={styles.main}>
          {children}
        </main>
        <footer className={styles.footer}>
          <div className={styles.footerInner}>
            <div className={styles.footerBrand}>
              <Link href="/dashboard" className={styles.brand}>
                <span className={styles.brandName}>Liberalis</span>
              </Link>
              <p className={styles.footerTagline}>Your student portal for attendance, events, and more.</p>
            </div>
            <nav className={styles.footerLinks}>
              <Link href="/feedback">Feedback</Link>
              <Link href="/faq">FAQ</Link>
            </nav>
            <p className={styles.footerCopyright}>© {new Date().getFullYear()} Liberalis. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </ToastProvider>
  )
}
