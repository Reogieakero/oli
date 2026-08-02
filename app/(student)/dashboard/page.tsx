'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import QRCode from 'qrcode'
import { apiClient } from '@/lib/apiClient'
import { Card, CardHeader, CardBody } from '@/components/ui/Card/Card'
import { Badge } from '@/components/ui/Badge/Badge'
import { Spinner } from '@/components/ui/Spinner/Spinner'
import { StatCard } from '@/components/ui/StatCard/StatCard'
import { ChartCard } from '@/components/charts/ChartCard/ChartCard'
import styles from './page.module.css'

interface StudentProfile {
  id: string
  firstName: string
  lastName: string
  studentId: string
  yearLevel: number
  email: string
  course: { id: string; code: string; name: string } | null
  avatarUrl: string | null
  qrCodeToken: string | null
  stats: {
    totalAttendance: number
    activeSanctions: number
    outstandingBalances: number
    pendingDisputes: number
  }
}

interface AttendanceRecord {
  id: string
  status: 'present' | 'late' | 'absent'
  scannedAt: string | null
  event: { title: string }
}

interface AttendanceHistoryResponse {
  data: AttendanceRecord[]
  total: number
}

interface EventItem {
  id: string
  title: string
  eventDate: string
  venue: string
  startTime: string
  endTime: string
  isMandatory: boolean
  isActive: boolean
}

interface EventsResponse {
  data: EventItem[]
  total: number
}

interface AnnouncementItem {
  id: string
  title: string
  createdAt: string
  status: string
  faculty: { fullName: string }
  _count: { reads: number }
}

interface AnnouncementsResponse {
  data: AnnouncementItem[]
  total: number
}

interface BalanceItem {
  id: string
  description: string
  amount: string
  status: 'unpaid' | 'partial' | 'paid'
  dueDate: string | null
  payments: { id: string; amount: string; status: string }[]
}

interface BalancesResponse {
  data: BalanceItem[]
  total: number
}

function statusBadgeVariant(status: string) {
  switch (status) {
    case 'present': return 'success' as const
    case 'late': return 'warning' as const
    case 'absent': return 'danger' as const
    default: return 'neutral' as const
  }
}

function formatTime(t: string) {
  const [h, m] = t.split(':')
  const hr = parseInt(h)
  const ampm = hr >= 12 ? 'PM' : 'AM'
  const h12 = hr % 12 || 12
  return `${h12}:${m} ${ampm}`
}

function safeDate(dateStr: string) {
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? null : d
}

function formatDate(dateStr: string) {
  const d = safeDate(dateStr)
  return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
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

export default function StudentDashboardPage() {
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([])
  const [events, setEvents] = useState<EventItem[]>([])
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([])
  const [balances, setBalances] = useState<BalanceItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAll() {
      try {
        const opts = { authenticated: true }
        const [profileRes, attRes, evtRes, annRes, balRes] = await Promise.all([
          apiClient<StudentProfile>('/students/me', opts),
          apiClient<AttendanceHistoryResponse>('/attendance/history?limit=1000', opts),
          apiClient<EventsResponse>('/events?limit=100', opts),
          apiClient<AnnouncementsResponse>('/announcements?limit=3', opts),
          apiClient<BalancesResponse>('/balances?limit=100', opts),
        ])
        setProfile(profileRes)
        setAttendanceData(attRes.data)
        setEvents(evtRes.data)
        setAnnouncements(annRes.data)
        setBalances(balRes.data)
      } catch (err) {
        console.error('Dashboard fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  const presentCount = attendanceData.filter((r) => r.status === 'present').length
  const totalBalance = balances.reduce((sum, b) => sum + parseFloat(b.status !== 'paid' ? b.amount : '0'), 0)
  const totalDue = balances.reduce((sum, b) => sum + parseFloat(b.amount), 0)
  const totalPaid = balances.reduce((sum, b) => {
    const paid = b.payments
      .filter(p => p.status === 'approved')
      .reduce((s, p) => s + parseFloat(p.amount), 0)
    return sum + paid
  }, 0)
  const progressPercent = totalDue > 0 ? (totalPaid / totalDue) * 100 : 0
  const recentAttendance = attendanceData.length > 0 ? [attendanceData[0]] : []

  const upcomingEvents = events.filter((e) => {
    const eventEnd = `${e.eventDate}T${e.endTime}`
    return eventEnd >= nowISO()
  })
  const doneEvents = events.filter((e) => {
    const eventEnd = `${e.eventDate}T${e.endTime}`
    return eventEnd < nowISO()
  })
  const todayStr = new Date().toISOString().split('T')[0]
  const isEventToday = (date: string) => {
    const d = safeDate(date)
    return d ? d.toISOString().split('T')[0] === todayStr : false
  }

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  useEffect(() => {
    if (profile?.qrCodeToken) {
      QRCode.toDataURL(profile.qrCodeToken, { width: 160, margin: 2 })
        .then((url) => setQrDataUrl(url))
        .catch(() => setQrDataUrl(null))
    } else {
      setQrDataUrl(null)
    }
  }, [profile?.qrCodeToken])

  const [avatarSrc, setAvatarSrc] = useState<string | null>(null)
  useEffect(() => {
    if (!profile?.avatarUrl) {
      setAvatarSrc(null)
      return
    }
    let active = true
    apiClient<{ signedUrl: string }>(`/students/avatars/${encodeURIComponent(profile.avatarUrl)}`, { authenticated: true })
      .then((res) => { if (active) setAvatarSrc(res.signedUrl) })
      .catch(() => { if (active) setAvatarSrc(null) })
    return () => { active = false }
  }, [profile?.avatarUrl])

  useEffect(() => {
    let active = true

    async function refreshAttendance() {
      try {
        const attRes = await apiClient<AttendanceHistoryResponse>('/attendance/history?limit=1000', { authenticated: true })
        if (active) setAttendanceData(attRes.data)
      } catch {
        /* keep previous data on error */
      }
    }

    const timer = setInterval(refreshAttendance, 8000)
    refreshAttendance()

    return () => {
      active = false
      clearInterval(timer)
    }
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.blobCircles}>
        <div className={styles.blobLeft} />
        <div className={styles.blobRight} />
      </div>
      <div className={styles.content} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-2xl)', fontWeight: 700, margin: 0 }}>
          Welcome back, {loading ? '...' : `${profile?.firstName} ${profile?.lastName}`}
        </h1>
        {profile && (
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-muted-fg)' }}>
            {profile.studentId} &middot; {profile.course ? `${profile.course.code} ${profile.yearLevel}` : 'Course not set'}
          </p>
        )}
      </div>

      <div className={styles.statsGrid}>
        <StatCard
          value={loading ? '...' : doneEvents.length}
          label="Events Done"
        />
        <StatCard
          value={loading ? '...' : presentCount}
          label="Present"
        />
        <StatCard
          value={loading ? '...' : upcomingEvents.length}
          label="Upcoming Events"
        />
        <StatCard
          value={loading ? '...' : `₱${totalBalance.toFixed(2)}`}
          label="Outstanding Balance"
        />
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(360px, 100%), 1fr))',
        gap: 16,
      }}>
        <Card>
          <CardHeader>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: 'var(--text-base)', fontWeight: 600 }}>
              Student Profile
            </h3>
          </CardHeader>
          <CardBody>
            {loading ? (
              <Spinner style={{ padding: 16 }} />
            ) : !profile ? (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--color-muted-fg)', fontSize: 'var(--text-sm)' }}>
                No profile data.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 12, borderBottom: '1px solid var(--color-border)' }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: 'var(--color-brand-dark)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 'var(--text-lg)',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}>
                    {avatarSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarSrc} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-base)' }}>{profile.firstName} {profile.lastName}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted-fg)' }}>{profile.studentId}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <table style={{ width: '100%', minWidth: 0, borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                    <tbody>
                      {[
                        ['Email', profile.email],
                        ['Course', profile.course ? `${profile.course.name} (${profile.course.code})` : '—'],
                        ['Year Level', profile.yearLevel ? `${profile.yearLevel}${profile.yearLevel === 1 ? 'st' : profile.yearLevel === 2 ? 'nd' : profile.yearLevel === 3 ? 'rd' : 'th'} Year` : '—'],
                      ].map(([label, value], i) => (
                        <tr key={label}>
                          <td style={{
                            padding: '8px 16px 8px 0',
                            color: 'var(--color-muted-fg)',
                            fontWeight: 500,
                            whiteSpace: 'nowrap',
                            verticalAlign: 'top',
                            borderBottom: i < 2 ? '1px solid var(--color-border)' : 'none',
                          }}>
                            {label}
                          </td>
                          <td style={{
                            padding: '8px 0',
                            verticalAlign: 'top',
                            borderBottom: i < 2 ? '1px solid var(--color-border)' : 'none',
                          }}>
                            {value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {qrDataUrl && (
                    <div style={{ flex: '1 1 100%', display: 'flex', justifyContent: 'center' }}>
                      <img src={qrDataUrl} alt="QR Code" style={{ width: 120, height: 120 }} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
        <ChartCard title="Balance Status" loading={loading} empty={balances.length === 0} emptyMessage="No balance records.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 0 4px', textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--text-sm)' }}>
              <span style={{ color: 'var(--color-muted-fg)' }}>Total Due </span>
              <span style={{ fontWeight: 600 }}>₱{totalDue.toFixed(2)}</span>
            </div>
            <div style={{ fontSize: 'var(--text-sm)' }}>
              <span style={{ color: 'var(--color-muted-fg)' }}>Total Paid </span>
              <span style={{ fontWeight: 600, color: 'var(--color-status-success)' }}>₱{totalPaid.toFixed(2)}</span>
            </div>
            <div style={{ width: '80%', height: 12, margin: '0 auto', background: 'var(--color-muted-bg)', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(progressPercent, 100)}%`,
                background: progressPercent >= 100 ? 'var(--color-status-success)' : 'var(--color-brand-dark)',
                borderRadius: 6,
                transition: 'width 0.5s ease',
              }} />
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted-fg)' }}>
              {progressPercent.toFixed(0)}% paid &middot; {balances.length} balance{balances.length !== 1 ? 's' : ''}
            </div>
          </div>
        </ChartCard>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(360px, 100%), 1fr))',
        gap: 16,
      }}>
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: 'var(--text-base)', fontWeight: 600 }}>
                Recent Attendance
              </h3>
              <Link href="/attendance" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-brand-dark)', textDecoration: 'none' }}>
                View all
              </Link>
            </div>
          </CardHeader>
          <CardBody>
            {loading ? (
              <Spinner style={{ padding: 16 }} />
            ) : recentAttendance.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--color-muted-fg)', fontSize: 'var(--text-sm)' }}>
                No attendance records yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentAttendance.map((r) => (
                  <div key={r.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: 16,
                    background: 'var(--color-muted-bg)',
                    borderRadius: 'var(--radius-control)',
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: 'var(--color-muted-bg)',
                      color: 'var(--color-brand-dark)',
                      fontWeight: 700,
                      fontSize: 'var(--text-lg)',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}>
                      {avatarSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarSrc} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        `${profile?.firstName?.charAt(0) ?? ''}${profile?.lastName?.charAt(0) ?? ''}`
                      )}
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{r.event.title}</span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted-fg)' }}>
                        {r.scannedAt ? formatDate(r.scannedAt) : '—'}
                      </span>
                    </div>
                    <Badge variant={statusBadgeVariant(r.status)}>
                      {r.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: 'var(--text-base)', fontWeight: 600 }}>
                Upcoming Events
              </h3>
              <Link href="/events" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-brand-dark)', textDecoration: 'none' }}>
                View all
              </Link>
            </div>
          </CardHeader>
          <CardBody>
            {loading ? (
              <Spinner style={{ padding: 16 }} />
            ) : upcomingEvents.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--color-muted-fg)', fontSize: 'var(--text-sm)' }}>
                No upcoming events.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {upcomingEvents.map((e) => {
                  const eventStart = `${e.eventDate}T${e.startTime}`
                  const eventEnd = `${e.eventDate}T${e.endTime}`
                  const now = nowISO()
                  const isOngoing = eventStart <= now && eventEnd >= now
                  let statusLabel = 'Upcoming'
                  let statusVariant: 'success' | 'brand' = 'success'
                  if (isOngoing) { statusLabel = 'Ongoing'; statusVariant = 'brand' }
                  return (
                  <div key={e.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 0',
                    borderBottom: '1px solid var(--color-border)',
                  }}>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      minWidth: 40,
                    }}>
                      {(() => {
                        const d = safeDate(e.eventDate)
                        return d ? (
                          <>
                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted-fg)', textTransform: 'uppercase' }}>
                              {d.toLocaleDateString('en-US', { month: 'short' })}
                            </span>
                            <span style={{
                              fontFamily: 'var(--font-heading)',
                              fontSize: 'var(--text-lg)',
                              fontWeight: 700,
                              lineHeight: 1,
                            }}>
                              {d.getDate()}
                            </span>
                          </>
                        ) : (
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted-fg)' }}>—</span>
                        )
                      })()}
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Badge variant={statusVariant}>{statusLabel}</Badge>
                        {e.isMandatory && <Badge variant="warning">Mandatory</Badge>}
                        {isEventToday(e.eventDate) && !isOngoing && <Badge variant="brand">Today</Badge>}
                      </div>
                      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>{e.title}</span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted-fg)' }}>
                        {e.venue} &middot; {formatTime(e.startTime)} - {formatTime(e.endTime)}
                      </span>
                    </div>
                  </div>
                  )
                })}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: 'var(--text-base)', fontWeight: 600 }}>
              Latest Announcements
            </h3>
            <Link href="/announcements" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-brand-dark)', textDecoration: 'none' }}>
              View all
            </Link>
          </div>
        </CardHeader>
        <CardBody>
          {loading ? (
            <Spinner style={{ padding: 16 }} />
          ) : announcements.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--color-muted-fg)', fontSize: 'var(--text-sm)' }}>
              No announcements yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {announcements.map((a) => (
                <div key={a.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 0',
                  borderBottom: '1px solid var(--color-border)',
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div>
                      <Badge variant={a.status === 'published' ? 'success' : a.status === 'archived' ? 'warning' : 'neutral'}>{a.status.charAt(0).toUpperCase() + a.status.slice(1)}</Badge>
                    </div>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>{a.title}</span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted-fg)' }}>
                      {a.faculty?.fullName || 'Unknown'} &middot; {formatDate(a.createdAt)}
                    </span>
                  </div>
                  <Link href={`/announcements#${a.id}`} style={{ fontSize: 'var(--text-xs)', color: 'var(--color-brand-dark)', textDecoration: 'none' }}>
                    Read
                  </Link>
                </div>
              ))}
            </div>
          )}
          </CardBody>
      </Card>
      </div>
    </div>
  )
}
