'use client'

import type { ReactNode } from 'react'
import styles from './ChartCard.module.css'

interface ChartCardProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  loading?: boolean
  empty?: boolean
  emptyMessage?: string
  children?: ReactNode
  className?: string
  compact?: boolean
}

export function ChartCard({
  title,
  subtitle,
  actions,
  loading,
  empty,
  emptyMessage = 'No data for this period.',
  children,
  className,
  compact,
}: ChartCardProps) {
  const cardClass = [styles.chartCard, className].filter(Boolean).join(' ')
  const wrapperClass = [styles.chartWrapper, compact ? styles.chartWrapperCompact : '']
    .filter(Boolean)
    .join(' ')

  return (
    <div className={cardClass}>
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <div className={styles.title}>{title}</div>
          {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>

      <div className={wrapperClass}>
        {loading ? (
          <div className={styles.loading}>
            <div className={styles.skeletonBar} style={{ width: '60%' }} />
            <div className={styles.skeletonBar} style={{ width: '80%' }} />
            <div className={styles.skeletonBar} style={{ width: '50%' }} />
          </div>
        ) : empty ? (
          <div className={styles.empty}>
            <span>{emptyMessage}</span>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}