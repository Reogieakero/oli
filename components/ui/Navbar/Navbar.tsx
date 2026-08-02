'use client'

import { useRouter, usePathname } from 'next/navigation'
import { DropdownMenu } from '@/components/ui/DropdownMenu/DropdownMenu'
import styles from './Navbar.module.css'

const PAGE_NAMES: Record<string, string> = {
  '/admin/dashboard': 'Dashboard',
  '/admin/courses': 'Courses',
  '/admin/events': 'Events',
  '/admin/attendance': 'Attendance',
  '/admin/balances': 'Balances',
  '/admin/sanctions': 'Sanctions',
  '/admin/reports': 'Reports',
  '/admin/announcements': 'Announcements',
  '/admin/documents': 'Documents',
  '/admin/students': 'Students',
}

export function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const pageName = PAGE_NAMES[pathname] || ''

  const handleLogout = () => {
    document.cookie = 'access_token=; path=/; max-age=0'
    document.cookie = 'refresh_token=; path=/; max-age=0'
    router.replace('/admin-login')
  }

  return (
    <header className={styles.navbar}>
      <div className={styles.left}>
        <span className={styles.brand}>Liberalis</span>
        {pageName && (
          <>
            <span className={styles.separator}>&rsaquo;</span>
            <span className={styles.pageName}>{pageName}</span>
          </>
        )}
      </div>
      <div className={styles.right}>
        <DropdownMenu
          trigger={
            <div className={styles.avatar}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          }
          items={[
            { label: 'Add Course', icon: PlusIcon(), onClick: () => router.push('/admin/courses') },
            { label: 'Add Events', icon: CalendarIcon(), onClick: () => router.push('/admin/events') },
            { label: 'Students', icon: StudentsIcon(), onClick: () => router.push('/admin/students') },
            { separator: true },
            { label: 'Logout', icon: LogoutIcon(), onClick: handleLogout },
          ]}
        />
      </div>
    </header>
  )
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

function StudentsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
