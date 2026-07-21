'use client'

import { useRouter } from 'next/navigation'
import styles from './Navbar.module.css'

export function Navbar() {
  const router = useRouter()

  const handleLogout = () => {
    document.cookie = 'access_token=; path=/; max-age=0'
    document.cookie = 'refresh_token=; path=/; max-age=0'
    router.replace('/admin-login')
  }

  return (
    <header className={styles.navbar}>
      <div className={styles.left}>
        <span className={styles.brand}>OLI</span>
      </div>
      <div className={styles.right}>
        <button className={styles.iconBtn} title="Help">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </button>
        <div className={styles.divider} />
        <div className={styles.userMenu}>
          <div className={styles.avatar}>F</div>
          <div className={styles.userText}>
            <div className={styles.userName}>Faculty User</div>
            <div className={styles.userRole}>Faculty</div>
          </div>
        </div>
        <button className={styles.logoutBtn} onClick={handleLogout} title="Sign out">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </header>
  )
}
