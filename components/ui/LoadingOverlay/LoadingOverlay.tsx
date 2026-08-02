'use client'

import type { ReactNode } from 'react'
import styles from './LoadingOverlay.module.css'

interface LoadingOverlayProps {
  visible: boolean
  message?: string
  children?: ReactNode
  fullscreen?: boolean
}

function LoadingOverlay({ visible, message = 'Loading...', children, fullscreen = false }: LoadingOverlayProps) {
  return (
    <div className={`${styles.wrapper} ${fullscreen ? styles.fullscreen : ''}`}>
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
