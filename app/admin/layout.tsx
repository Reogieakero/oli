'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/ui/Sidebar/Sidebar'
import { Navbar } from '@/components/ui/Navbar/Navbar'
import { ToastProvider } from '@/components/ui/Toast/Toast'
import styles from './layout.module.css'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    const token = document.cookie.match(/(?:^|;\s*)access_token=([^;]*)/)?.[1]
    if (!token) {
      router.replace('/admin-login')
      return
    }
    setAuthed(true)
  }, [router])

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
