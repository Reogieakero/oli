'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { usePageTitle } from '@/lib/usePageTitle'
import { Sidebar } from '@/components/ui/Sidebar/Sidebar'
import { Navbar } from '@/components/ui/Navbar/Navbar'
import { ToastProvider } from '@/components/ui/Toast/Toast'
import styles from './layout.module.css'

const PAGE_TITLES: Record<string, string> = {
  '/admin/dashboard': 'Dashboard',
  '/admin/students': 'Students',
  '/admin/attendance': 'Attendance',
  '/admin/courses': 'Courses',
  '/admin/balances': 'Balances',
  '/admin/sanctions': 'Sanctions',
  '/admin/announcements': 'Announcements',
  '/admin/events': 'Events',
  '/admin/documents': 'Documents',
  '/admin/feedback': 'Feedback',
  '/admin/reports': 'Reports',
  '/admin/faq': 'FAQ',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    const token = document.cookie.match(/(?:^|;\s*)access_token=([^;]*)/)?.[1]
    if (!token) {
      router.replace('/admin-login')
      return
    }
    setAuthed(true)
  }, [router])

  const pageTitle = pathname ? PAGE_TITLES[pathname] : undefined
  usePageTitle(pageTitle)

  if (!authed) return null

  return (
    <ToastProvider>
      <div className={styles.layout}>
        <Sidebar />
        <div className={styles.main}>
          <Navbar />
          <div className={styles.content}>
            {children}
          </div>
        </div>
      </div>
    </ToastProvider>
  )
}
