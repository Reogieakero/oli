'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/ui/Sidebar/Sidebar'
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
    <div className={styles.layout}>
      <Sidebar />
      <div className={styles.main}>
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </div>
  )
}
