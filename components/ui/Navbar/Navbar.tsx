import type { ReactNode } from 'react'
import styles from './Navbar.module.css'

interface NavbarProps {
  title: string
  actions?: ReactNode
}

export function Navbar({ title, actions }: NavbarProps) {
  return (
    <header className={styles.navbar}>
      <div className={styles.left}>
        <div className={styles.pageTitle}>{title}</div>
      </div>
      {actions && <div className={styles.right}>{actions}</div>}
    </header>
  )
}
