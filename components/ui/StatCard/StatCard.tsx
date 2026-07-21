'use client'

import type { ReactNode } from 'react'
import styles from './StatCard.module.css'

interface StatCardProps {
  value: string | number
  label: string
  trend?: {
    direction: 'up' | 'down'
    value: string
  }
  loading?: boolean
  className?: string
}

export function StatCard({ value, label, trend, loading, className }: StatCardProps) {
  const cardClass = [styles.card, className].filter(Boolean).join(' ')

  if (loading) {
    return (
      <div className={cardClass}>
        <div className={styles.skeleton} />
        <div className={styles.skeleton} style={{ width: '40%', height: 14 }} />
      </div>
    )
  }

  return (
    <div className={cardClass}>
      <div className={styles.value}>{value}</div>
      <div className={styles.label}>{label}</div>
      {trend && (
        <span className={`${styles.trend} ${trend.direction === 'up' ? styles.trendUp : styles.trendDown}`}>
          {trend.direction === 'up' ? '↑' : '↓'} {trend.value}
        </span>
      )}
    </div>
  )
}