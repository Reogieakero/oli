'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/apiClient'
import { Card, CardBody } from '@/components/ui/Card/Card'
import { Badge } from '@/components/ui/Badge/Badge'
import { StatCard } from '@/components/ui/StatCard/StatCard'
import { Spinner } from '@/components/ui/Spinner/Spinner'
import styles from './page.module.css'

interface AttendanceRecord {
  id: string
  status: 'present' | 'late' | 'absent'
  scannedAt: string | null
  event: { id: string; title: string; eventDate: string; startTime: string; venue: string; isMandatory: boolean }
  dispute: { id: string; status: string } | null
}

interface ActiveSanction {
  type: 'absence' | 'late'
  count: number
  threshold: number
  level: string
}

interface NextSanction {
  type: 'absence' | 'late'
  count: number
  atCount: number
  level: string
  remaining: number
}

interface SanctionStatus {
  absenceCount: number
  lateCount: number
  activeSanctions: ActiveSanction[]
  nextSanctionThresholds: NextSanction[]
}

function statusBadge(status: string) {
  switch (status) {
    case 'present': return { variant: 'success' as const, label: 'Present' }
    case 'late': return { variant: 'warning' as const, label: 'Late' }
    case 'absent': return { variant: 'danger' as const, label: 'Absent' }
    default: return { variant: 'neutral' as const, label: status }
  }
}

function formatDateShort(d: string) {
  const datePart = d.includes('T') ? d.split('T')[0] : d
  const parts = datePart.split('-')
  if (parts.length !== 3) return { month: d, day: d }
  const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
  return {
    month: date.toLocaleDateString('en-US', { month: 'short' }),
    day: String(date.getDate()),
  }
}

function formatDate(d: string) {
  const datePart = d.includes('T') ? d.split('T')[0] : d
  const parts = datePart.split('-')
  if (parts.length !== 3) return d
  const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(t: string) {
  const timePart = t.includes('T') ? t.split('T')[1]?.split('.')[0] ?? t : t
  const parts = timePart.split(':')
  if (parts.length < 2) return t
  const h = parseInt(parts[0], 10)
  const m = parts[1]
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${m} ${ampm}`
}

function RecordCard({ r }: { r: AttendanceRecord }) {
  const { month, day } = formatDateShort(r.event.eventDate)
  const badge = statusBadge(r.status)
  return (
    <Card>
      <CardBody className={styles.cardBody}>
        <div className={styles.cardDateBadge}>
          <span className={styles.cardDateMonth}>{month}</span>
          <span className={styles.cardDateDay}>{day}</span>
        </div>
        <div className={styles.cardContent}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>{r.event.title}</span>
            <Badge variant={badge.variant}>{badge.label}</Badge>
          </div>
          <div className={styles.cardMeta}>
            <span>{formatDate(r.event.eventDate)}</span>
            <span>{r.event.venue}</span>
            {r.scannedAt && <span>Scanned {formatTime(r.scannedAt)}</span>}
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

export default function SanctionsPage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [sanctions, setSanctions] = useState<SanctionStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const opts = { authenticated: true }
        const [attRes, sancRes] = await Promise.all([
          apiClient<{ data: AttendanceRecord[]; total: number }>('/attendance/history?limit=1000', opts),
          apiClient<SanctionStatus>('/attendance/sanctions', opts),
        ])
        setRecords(attRes.data)
        setSanctions(sancRes)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const absences = records.filter(r => r.status === 'absent')
  const lates = records.filter(r => r.status === 'late')
  const active = sanctions?.activeSanctions[0] ?? null
  const next = sanctions?.nextSanctionThresholds ?? []
  const activeLevel = active ? active.level : 'None'

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Sanctions</h1>

      <div className={styles.statsGrid}>
        <StatCard value={loading ? '...' : activeLevel} label="Active Sanction" />
        <StatCard value={loading ? '...' : sanctions?.absenceCount ?? 0} label="Absences" />
        <StatCard value={loading ? '...' : sanctions?.lateCount ?? 0} label="Lates" />
      </div>

      {loading ? (
        <Spinner style={{ padding: 24 }} />
      ) : active ? (
        <Card>
          <CardBody className={styles.cardBody}>
            <div className={`${styles.sancBadge} ${styles.sancBadgeDanger}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div className={styles.cardContent}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>Active {active.type === 'absence' ? 'Absence' : 'Late'} Sanction: {active.level}</span>
              </div>
              <div className={styles.cardMeta}>
                You have {active.count} {active.type === 'absence' ? 'absence' : 'late'}(s), which {active.count === 1 ? 'matches' : 'match(es)'} the sanction threshold of {active.threshold} {active.type === 'absence' ? 'absence' : 'late'}(s).
              </div>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className={styles.cardBody}>
            <div className={`${styles.sancBadge} ${styles.sancBadgeWarning}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div className={styles.cardContent}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>No active sanction</span>
              </div>
              <div className={styles.cardMeta}>
                {next.length > 0
                  ? next.map(n => `${n.remaining} ${n.type === 'absence' ? 'absence' : 'late'}(s) until ${n.level} (at ${n.atCount})`).join(' · ')
                  : 'You have no pending sanction thresholds.'}
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Why you have this sanction</h2>
      </div>

      <div className={styles.sectionHeader}>
        <h3 className={styles.subTitle}>Absences ({absences.length})</h3>
      </div>
      {absences.length === 0 ? (
        <div className={styles.emptyState}>No absences recorded.</div>
      ) : (
        <div className={styles.cardGrid}>
          {absences.map(r => <RecordCard key={r.id} r={r} />)}
        </div>
      )}

      <div className={styles.sectionHeader}>
        <h3 className={styles.subTitle}>Lates ({lates.length})</h3>
      </div>
      {lates.length === 0 ? (
        <div className={styles.emptyState}>No lates recorded.</div>
      ) : (
        <div className={styles.cardGrid}>
          {lates.map(r => <RecordCard key={r.id} r={r} />)}
        </div>
      )}
    </div>
  )
}
