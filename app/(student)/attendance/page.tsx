'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { apiClient } from '@/lib/apiClient'
import { Card, CardBody } from '@/components/ui/Card/Card'
import { Badge } from '@/components/ui/Badge/Badge'
import { StatCard } from '@/components/ui/StatCard/StatCard'
import { Spinner } from '@/components/ui/Spinner/Spinner'
import { DataTable, type Column } from '@/components/ui/DataTable/DataTable'
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

interface SanctionStatus {
  absenceCount: number
  lateCount: number
  activeSanctions: ActiveSanction[]
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

type ViewMode = 'card' | 'table'

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [sanctions, setSanctions] = useState<SanctionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('card')

  useEffect(() => {
    async function fetchData() {
      try {
        const opts = { authenticated: true }
        const [attRes, sancRes] = await Promise.all([
          apiClient<{ data: AttendanceRecord[]; total: number }>('/attendance/history?limit=100', opts),
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

  useEffect(() => {
    let active = true

    async function refreshData() {
      try {
        const opts = { authenticated: true }
        const [attRes, sancRes] = await Promise.all([
          apiClient<{ data: AttendanceRecord[]; total: number }>('/attendance/history?limit=100', opts),
          apiClient<SanctionStatus>('/attendance/sanctions', opts),
        ])
        if (active) {
          setRecords(attRes.data)
          setSanctions(sancRes)
        }
      } catch {
        /* keep previous data on error */
      }
    }

    const timer = setInterval(refreshData, 8000)
    refreshData()

    return () => {
      active = false
      clearInterval(timer)
    }
  }, [])

  const present = records.filter(r => r.status === 'present').length
  const late = records.filter(r => r.status === 'late').length
  const absent = records.filter(r => r.status === 'absent').length
  const disputed = records.filter(r => r.dispute).length
  const sanction = sanctions?.activeSanctions[0] ?? null

  const columns: Column<AttendanceRecord>[] = useMemo(() => [
    {
      key: 'title',
      header: 'Event',
      sortable: true,
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>{row.event.title}</span>
          {row.event.isMandatory && <Badge variant="warning">Req</Badge>}
        </div>
      ),
    },
    {
      key: 'eventDate',
      header: 'Date',
      sortable: true,
      render: (row) => formatDate(row.event.eventDate),
    },
    {
      key: 'venue',
      header: 'Venue',
      render: (row) => row.event.venue,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => {
        if (row.dispute) return <Badge variant="brand">Dispute: {row.dispute.status}</Badge>
        const badge = statusBadge(row.status)
        return <Badge variant={badge.variant}>{badge.label}</Badge>
      },
    },
    {
      key: 'scannedAt',
      header: 'Scanned',
      render: (row) => row.scannedAt ? formatTime(row.scannedAt) : '—',
    },
  ], [])

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Attendance</h1>

      <div className={styles.statsGrid}>
        <StatCard value={loading ? '...' : present} label="Present" />
        <StatCard value={loading ? '...' : late} label="Late" />
        <StatCard value={loading ? '...' : absent} label="Absent" />
        <StatCard value={loading ? '...' : disputed} label="Disputed" />
        <Link href="/sanctions" className={styles.sanctionCard}>
          <div className={styles.sanctionValue}>{loading ? '...' : (sanction ? sanction.count : 0)}</div>
          <div className={styles.sanctionLabel}>
            {sanction
              ? `${sanction.type === 'absence' ? 'Absence' : 'Late'} Sanction: ${sanction.level}`
              : 'Sanction'}
          </div>
          <span className={styles.readMore}>Read more &rarr;</span>
        </Link>
      </div>

      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Attendance Records</h2>
        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewBtn} ${viewMode === 'card' ? styles.viewBtnActive : ''}`}
            onClick={() => setViewMode('card')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
            Card
          </button>
          <button
            className={`${styles.viewBtn} ${viewMode === 'table' ? styles.viewBtnActive : ''}`}
            onClick={() => setViewMode('table')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            Table
          </button>
        </div>
      </div>

      {loading ? (
        <Spinner style={{ padding: 24 }} />
      ) : records.length === 0 ? (
        <div className={styles.emptyState}>No attendance records yet.</div>
      ) : viewMode === 'table' ? (
        <DataTable
          columns={columns}
          data={records}
          getRowId={(r) => r.id}
          emptyState={<div className={styles.emptyState}>No attendance records yet.</div>}
        />
      ) : (
        <div className={styles.cardGrid}>
          {records.map((r) => {
            const { month, day } = formatDateShort(r.event.eventDate)
            const badge = r.dispute ? { variant: 'brand' as const, label: `Dispute: ${r.dispute.status}` } : statusBadge(r.status)
            return (
              <Card key={r.id}>
                <CardBody className={styles.cardBody}>
                  <div className={styles.cardDateBadge}>
                    <span className={styles.cardDateMonth}>{month}</span>
                    <span className={styles.cardDateDay}>{day}</span>
                  </div>
                  <div className={styles.cardContent}>
                    <div className={styles.cardHeader}>
                      <span className={styles.cardTitle}>{r.event.title}</span>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                      {r.event.isMandatory && <Badge variant="warning">Mandatory</Badge>}
                    </div>
                    <div className={styles.cardMeta}>
                      <span>{r.event.venue}</span>
                      {r.scannedAt && <span>Scanned {formatTime(r.scannedAt)}</span>}
                    </div>
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
