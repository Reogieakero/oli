'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiClient } from '@/lib/apiClient'
import { Badge } from '@/components/ui/Badge/Badge'
import { Card, CardBody } from '@/components/ui/Card/Card'
import { Spinner } from '@/components/ui/Spinner/Spinner'

interface EventDetail {
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
  coverPhoto: string | null
  lateCutoffTime: number
  targetYearLevel: number | null
  programPasscode: string
  course: { code: string; name: string } | null
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
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function ChevronLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [event, setEvent] = useState<EventDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchEvent() {
      try {
        const data = await apiClient<EventDetail>(`/events/${id}`, { authenticated: true })
        setEvent(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchEvent()
  }, [id])

  if (loading) return <Spinner style={{ padding: 40 }} />
  if (!event) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-muted-fg)' }}>Event not found.</div>

  const now = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}T${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}:${String(new Date().getSeconds()).padStart(2, '0')}`
  const eventStart = `${event.eventDate}T${event.startTime}`
  const eventEnd = `${event.eventDate}T${event.endTime}`
  const isPast = eventEnd < now
  const isOngoing = eventStart <= now && eventEnd >= now

  const meta = [
    { label: 'Date', value: formatDate(event.eventDate) },
    { label: 'Time', value: `${formatTime(event.startTime)} - ${formatTime(event.endTime)}` },
    { label: 'Venue', value: event.venue },
    { label: 'Faculty', value: event.faculty.fullName },
    ...(event.course ? [{ label: 'Course', value: `${event.course.name} (${event.course.code})` }] : []),
    ...(event.targetYearLevel ? [{ label: 'Target Year', value: `${event.targetYearLevel}${event.targetYearLevel === 1 ? 'st' : event.targetYearLevel === 2 ? 'nd' : event.targetYearLevel === 3 ? 'rd' : 'th'} Year` }] : []),
    { label: 'Late Cutoff', value: `${event.lateCutoffTime} minutes` },
    { label: 'Attendance', value: `${event._count.attendanceRecords} recorded` },
  ]

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <button
        onClick={() => router.back()}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--color-muted-fg)', fontSize: 'var(--text-sm)',
          padding: '6px 0', width: 'fit-content',
          transition: 'color 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-brand-dark)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-muted-fg)')}
      >
        <ChevronLeft /> Back
      </button>

      <Card>
        <CardBody style={{ padding: 0 }}>
          <div style={{
            background: isPast ? 'var(--color-muted-bg)' : 'var(--color-brand-dark)',
            color: isPast ? 'var(--color-neutral-900)' : '#fff',
            borderRadius: 'var(--radius-control) var(--radius-control) 0 0',
            padding: 28,
          }}>
            <div style={{ display: 'flex', gap: 20 }}>
              <div style={{
                textAlign: 'center', minWidth: 72,
                background: isPast ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.12)',
                borderRadius: 'var(--radius-control)', padding: '10px 14px',
              }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>
                  {formatDate(event.eventDate).split(' ')[0]}
                </div>
                <div style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.1 }}>
                  {event.eventDate.split('-')[2]}
                </div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>
                  {event.eventDate.split('-')[0]}
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
                <h1 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 700 }}>
                  {event.title}
                </h1>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <Badge variant={isPast ? 'neutral' : isOngoing ? 'brand' : 'success'}>
                    {!event.isActive ? 'Inactive' : isPast ? 'Completed' : isOngoing ? 'Ongoing' : 'Upcoming'}
                  </Badge>
                  {event.isMandatory && <Badge variant="warning">Mandatory</Badge>}
                </div>
              </div>
            </div>
          </div>

          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 12,
            }}>
              {meta.map((m) => (
                <div key={m.label} style={{
                  display: 'flex', alignItems: 'baseline',
                  padding: '8px 0', borderBottom: '1px solid var(--color-border)',
                }}>
                  <span style={{
                    minWidth: 120, fontSize: 'var(--text-xs)',
                    color: 'var(--color-muted-fg)', fontWeight: 500,
                    textTransform: 'uppercase', letterSpacing: '0.3px',
                  }}>
                    {m.label}
                  </span>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                    {m.value}
                  </span>
                </div>
              ))}
            </div>

            {event.description && (
              <div>
                <h3 style={{
                  fontFamily: 'var(--font-heading)', fontSize: 'var(--text-sm)',
                  fontWeight: 600, margin: '0 0 10px',
                  textTransform: 'uppercase', letterSpacing: '0.3px',
                  color: 'var(--color-muted-fg)',
                }}>
                  Description
                </h3>
                <p style={{
                  margin: 0, fontSize: 'var(--text-sm)', lineHeight: 1.7,
                  color: 'var(--color-neutral-800)',
                  whiteSpace: 'pre-wrap',
                }}>
                  {event.description}
                </p>
              </div>
            )}

            {event.importantNotice && (
              <div style={{
                padding: '16px 18px',
                background: 'var(--color-status-warning-bg)',
                borderRadius: 'var(--radius-control)',
                border: '1px solid var(--color-status-warning)',
                display: 'flex', gap: 10, alignItems: 'flex-start',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-status-warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 1, flexShrink: 0 }}>
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', marginBottom: 2 }}>Important Notice</div>
                  <p style={{ margin: 0, fontSize: 'var(--text-sm)', whiteSpace: 'pre-wrap' }}>{event.importantNotice}</p>
                </div>
              </div>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
