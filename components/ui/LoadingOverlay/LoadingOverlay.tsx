'use client'

import type { ReactNode } from 'react'
import styles from './LoadingOverlay.module.css'

interface LoadingOverlayProps {
  visible: boolean
  message?: string
  children?: ReactNode
}

function LoadingOverlay({ visible, message = 'Loading...', children }: LoadingOverlayProps) {
  return (
    <div className={styles.wrapper}>
      {children}
      {visible && (
        <div className={styles.overlay}>
          <div className={styles.spinner} />
          <span className={styles.message}>{message}</span>
        </div>
      )}
    </div>
  )
}

LoadingOverlay.displayName = 'LoadingOverlay'

export { LoadingOverlay }
