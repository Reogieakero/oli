'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiClient } from '@/lib/apiClient'
import { Card, CardHeader, CardBody } from '@/components/ui/Card/Card'
import { Badge } from '@/components/ui/Badge/Badge'
import { Spinner } from '@/components/ui/Spinner/Spinner'

interface EventItem {
  id: string
  title: string
  eventDate: string
  venue: string
  startTime: string
  endTime: string
  isMandatory: boolean
  isActive: boolean
  description: string | null
  importantNotice: string | null
  faculty: { fullName: string }
  _count: { attendanceRecords: number }
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

function formatDate(d: string) {
  const datePart = d.includes('T') ? d.split('T')[0] : d
  const parts = datePart.split('-')
  if (parts.length !== 3) return d
  const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function toDateStr(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function toTimeStr(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`
}

function nowISO() {
  return `${toDateStr(new Date())}T${toTimeStr(new Date())}`
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all')

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await apiClient<{ data: EventItem[]; total: number }>('/events?limit=100', { authenticated: true })
        setEvents(res.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const now = nowISO()

  const upcoming = events.filter(e => `${e.eventDate}T${e.endTime}` >= now).sort((a, b) => a.eventDate.localeCompare(b.eventDate))
  const past = events.filter(e => `${e.eventDate}T${e.endTime}` < now).sort((a, b) => b.eventDate.localeCompare(a.eventDate))

  const displayed = filter === 'all' ? events : filter === 'upcoming' ? upcoming : past

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-2xl)', fontWeight: 700, margin: 0 }}>
          Events
        </h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['all', 'upcoming', 'past'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-control)',
                border: `1px solid ${filter === f ? 'var(--color-brand-dark)' : 'var(--color-border)'}`,
                background: filter === f ? 'var(--color-brand-dark)' : 'transparent',
                color: filter === f ? '#fff' : 'var(--color-neutral-900)',
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >{f}</button>
          ))}
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(380px, 100%), 1fr))',
        gap: 12,
      }}>
        {loading ? (
          <Spinner style={{ gridColumn: '1 / -1', padding: 40 }} />
        ) : displayed.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-muted-fg)', gridColumn: '1 / -1' }}>No events found.</div>
        ) : (
          displayed.map((e) => {
            const eventStart = `${e.eventDate}T${e.startTime}`
            const eventEnd = `${e.eventDate}T${e.endTime}`
            const isPast = eventEnd < now
            const isOngoing = eventStart <= now && eventEnd >= now
            let eventStatus = ''
            let statusVariant: 'success' | 'warning' | 'danger' | 'neutral' | 'brand' = 'neutral'
            if (!e.isActive) { eventStatus = 'Inactive'; statusVariant = 'danger' }
            else if (isPast) { eventStatus = 'Completed'; statusVariant = 'neutral' }
            else if (isOngoing) { eventStatus = 'Ongoing'; statusVariant = 'brand' }
            else { eventStatus = 'Upcoming'; statusVariant = 'success' }
            return (
              <Card key={e.id} style={{ opacity: isPast && filter === 'all' ? 0.5 : 1 }}>
                <CardBody style={{ minHeight: 160 }}>
                  <div style={{ display: 'flex', gap: 12, minHeight: 160 }}>
                    <div style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      minWidth: 52, padding: '6px 10px',
                      background: isPast ? 'var(--color-muted-bg)' : 'var(--color-brand-dark)',
                      color: isPast ? 'var(--color-muted-fg)' : '#fff',
                      borderRadius: 'var(--radius-control)',
                    }}>
                      <span style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 600 }}>
                        {formatDate(e.eventDate).split(' ')[0]}
                      </span>
                      <span style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>
                        {e.eventDate.split('-')[2]}
                      </span>
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{e.title}</span>
                        <Badge variant={statusVariant}>{eventStatus}</Badge>
                        {e.isMandatory && <Badge variant="warning">Mandatory</Badge>}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted-fg)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span>{e.venue}</span>
                        <span>{formatTime(e.startTime)} - {formatTime(e.endTime)}</span>
                      </div>
                      {e.faculty && (
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted-fg)' }}>
                          by {e.faculty.fullName}
                        </div>
                      )}
                      {e.importantNotice && (
                        <div style={{
                          padding: '6px 10px', background: 'var(--color-status-warning-bg)',
                          borderRadius: 'var(--radius-control)', fontSize: 'var(--text-xs)',
                          border: '1px solid var(--color-status-warning)',
                        }}>
                          <strong>Notice:</strong> {e.importantNotice}
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted-fg)' }}>
                          {e._count.attendanceRecords} attendance{e._count.attendanceRecords !== 1 ? 's' : ''} recorded
                        </span>
                        <Link
                          href={`/events/${e.id}`}
                          style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-brand-dark)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 2 }}
                        >
                          View More <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
