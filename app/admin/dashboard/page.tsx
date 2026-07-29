'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { apiClient, ApiError } from '@/lib/apiClient'
import { StatCard } from '@/components/ui/StatCard/StatCard'
import { Badge } from '@/components/ui/Badge/Badge'
import { Select, type SelectOption } from '@/components/ui/Select/Select'
import { SearchBar } from '@/components/ui/SearchBar/SearchBar'
import { AttendanceTrendChart } from '@/components/charts/AttendanceTrendChart/AttendanceTrendChart'
import { EventAttendanceBarChart } from '@/components/charts/EventAttendanceBarChart/EventAttendanceBarChart'
import { StatusBreakdownDonut } from '@/components/charts/StatusBreakdownDonut/StatusBreakdownDonut'
import { BalanceStatusChart } from '@/components/charts/BalanceStatusChart/BalanceStatusChart'
import { DataTable, type Column } from '@/components/ui/DataTable/DataTable'
import styles from './page.module.css'

const PAGE_SIZE = 10

interface DashboardStats {
  totalStudents: number
  eventsThisMonth: number
  activeSanctions: number
  totalOutstanding: number
}

interface AttendanceBreakdown {
  present: number
  late: number
  absent: number
}

interface BalanceBreakdown {
  unpaid: number
  partial: number
  paid: number
}

interface TrendPoint {
  date: string
  event: string
  presentRate: number
  present: number
  late: number
  absent: number
  total: number
}

interface RecentAttendanceRow {
  id: string
  studentName: string
  studentId: string
  course: string
  event: string
  date: string
  status: string
  scannedAt: string | null
}

interface DashboardData {
  stats: DashboardStats
  attendanceBreakdown: AttendanceBreakdown
  balanceBreakdown: BalanceBreakdown
  attendanceTrend: TrendPoint[]
  recentAttendance: RecentAttendanceRow[]
}

interface EventAttendanceData {
  id: string
  title: string
  eventDate: string
  attendanceRate: number | null
  present: number
  late: number
  absent: number
}

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  present: 'success',
  late: 'warning',
  absent: 'danger',
}

const COLUMNS: Column<RecentAttendanceRow>[] = [
  { key: 'studentName', header: 'Student', sortable: true },
  { key: 'studentId', header: 'ID', sortable: true },
  { key: 'course', header: 'Course', sortable: true },
  { key: 'event', header: 'Event', sortable: true },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    render: (row) => (
      <Badge variant={STATUS_BADGE[row.status] ?? 'neutral'}>
        {row.status}
      </Badge>
    ),
  },
  {
    key: 'date',
    header: 'Date',
    sortable: true,
    render: (row) => new Date(row.date).toLocaleDateString(),
  },
]

export default function AdminDashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [data, setData] = useState<DashboardData | null>(null)
  const [eventAttendance, setEventAttendance] = useState<EventAttendanceData[]>([])
  const [statsLoading, setStatsLoading] = useState(true)
  const [chartTrendLoading, setChartTrendLoading] = useState(true)
  const [chartEventLoading, setChartEventLoading] = useState(true)
  const [tableLoading, setTableLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedEventId, setSelectedEventId] = useState(searchParams.get('event') ?? '')

  const eventTitleMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const e of eventAttendance) {
      map.set(e.id, e.title)
    }
    return map
  }, [eventAttendance])

  const selectedEventTitle = selectedEventId ? eventTitleMap.get(selectedEventId) ?? null : null

  const isAllEvents = !selectedEventId

  const fetchDashboard = useCallback(async () => {
    try {
      const result = await apiClient<DashboardData>('/reports/dashboard', {
        authenticated: true,
      })
      setData(result)
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 401) {
        router.replace('/admin-login')
      }
    } finally {
      setStatsLoading(false)
      setChartTrendLoading(false)
      setChartEventLoading(false)
      setTableLoading(false)
    }
  }, [router])

  const fetchEventAttendance = useCallback(async () => {
    try {
      const result = await apiClient<{ data: EventAttendanceData[] }>('/reports/events?limit=20', {
        authenticated: true,
      })
      setEventAttendance(result.data)
    } catch {
      /* silently fail */
    }
  }, [])

  useEffect(() => {
    fetchDashboard()
    fetchEventAttendance()
  }, [fetchDashboard, fetchEventAttendance])

  useEffect(() => {
    const urlValue = searchParams.get('event') ?? ''
    setSelectedEventId(urlValue)
  }, [searchParams])

  const handleEventChange = useCallback(
    (eventId: string) => {
      setSelectedEventId(eventId)
      setCurrentPage(1)
      const params = new URLSearchParams(searchParams.toString())
      if (eventId) {
        params.set('event', eventId)
      } else {
        params.delete('event')
      }
      router.replace(`/admin/dashboard?${params.toString()}`)
    },
    [router, searchParams]
  )

  const stats = data?.stats

  const donutData = useMemo(() => {
    if (isAllEvents) {
      const total =
        (data?.attendanceBreakdown.present ?? 0) +
        (data?.attendanceBreakdown.late ?? 0) +
        (data?.attendanceBreakdown.absent ?? 0)
      return {
        total,
        data: data
          ? [
              { name: 'Present', value: data.attendanceBreakdown.present, color: '' },
              { name: 'Late', value: data.attendanceBreakdown.late, color: '' },
              { name: 'Absent', value: data.attendanceBreakdown.absent, color: '' },
            ]
          : [],
      }
    }

    if (!selectedEventTitle) {
      return { total: 0, data: [] }
    }

    // Use per-event breakdown from /reports/events endpoint
    // (covers all events, not limited to the 30-day trend window)
    const matched = eventAttendance.find((e) => e.title === selectedEventTitle)
    if (!matched) {
      return { total: 0, data: [] }
    }

    const total = matched.present + matched.late + matched.absent
    return {
      total,
      data: [
        { name: 'Present', value: matched.present, color: '' },
        { name: 'Late', value: matched.late, color: '' },
        { name: 'Absent', value: matched.absent, color: '' },
      ],
    }
  }, [data, isAllEvents, selectedEventTitle, eventAttendance])

  // Balance is NOT event-scoped — it is tied to students directly, not to individual
  // events.  The Balance model has no relation to Event; it tracks running totals per
  // student.  Therefore the filter leaves balance data unaffected.
  const balanceData = data
    ? [
        { name: 'Unpaid', value: data.balanceBreakdown.unpaid, color: '' },
        { name: 'Partial', value: data.balanceBreakdown.partial, color: '' },
        { name: 'Paid', value: data.balanceBreakdown.paid, color: '' },
      ]
    : []

  const filteredAttendance = useMemo(() => {
    const rows = data?.recentAttendance ?? []
    return rows.filter((row) => {
      if (!isAllEvents && selectedEventTitle && row.event !== selectedEventTitle) {
        return false
      }
      const q = searchQuery.toLowerCase()
      if (!q) return true
      return (
        row.studentName.toLowerCase().includes(q) ||
        row.studentId.toLowerCase().includes(q) ||
        row.event.toLowerCase().includes(q) ||
        row.course.toLowerCase().includes(q)
      )
    })
  }, [data, isAllEvents, selectedEventTitle, searchQuery])

  const pageCount = Math.max(1, Math.ceil(filteredAttendance.length / PAGE_SIZE))
  const clampedPage = Math.min(currentPage, pageCount)
  const paginatedAttendance = filteredAttendance.slice(
    (clampedPage - 1) * PAGE_SIZE,
    clampedPage * PAGE_SIZE
  )

  const trendData = useMemo(() => {
    if (!data) return []
    if (isAllEvents) {
      if (data.attendanceTrend.length > 0) return data.attendanceTrend
      // Fallback: build points from per-event endpoint (covers all events, not just 30 days)
      return eventAttendance
        .filter((e) => e.attendanceRate !== null)
        .map((e) => ({
          date: (e.eventDate ?? '').split('T')[0],
          event: e.title,
          presentRate: e.attendanceRate!,
          present: e.present,
          late: e.late,
          absent: e.absent,
          total: e.present + e.late + e.absent,
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
    }
    if (!selectedEventTitle) return []

    const filtered = data.attendanceTrend.filter((t) => t.event === selectedEventTitle)
    if (filtered.length > 0) return filtered

    // No trend data (event is outside 30-day window) — create a single point
    // from the per-event attendance data so the chart shows something.
    const matched = eventAttendance.find((e) => e.title === selectedEventTitle)
    if (!matched || matched.attendanceRate === null) return []

    const date = (matched.eventDate ?? '').split('T')[0]
    return [
      {
        date,
        event: matched.title,
        presentRate: matched.attendanceRate,
        present: matched.present,
        late: matched.late,
        absent: matched.absent,
        total: matched.present + matched.late + matched.absent,
      },
    ]
  }, [data, isAllEvents, selectedEventTitle, eventAttendance])

  const barChartData = useMemo(() => {
    if (!eventAttendance.length) return []
    if (isAllEvents) {
      return eventAttendance
        .filter((e) => e.attendanceRate !== null)
        .map((e) => ({ name: e.title, presentRate: e.attendanceRate! }))
    }
    if (!selectedEventTitle) return []
    const matched = eventAttendance.find((e) => e.title === selectedEventTitle)
    return matched && matched.attendanceRate !== null
      ? [{ name: matched.title, presentRate: matched.attendanceRate }]
      : []
  }, [eventAttendance, isAllEvents, selectedEventTitle])

  return (
    <div className={styles.page}>
      <div className={styles.filterBar}>
        <label className={styles.filterLabel}>Event</label>
        <Select
          value={selectedEventId}
          onChange={(e) => handleEventChange(e.target.value)}
          options={[
            { value: '', label: 'All Events' },
            ...eventAttendance.map((ev) => ({ value: ev.id, label: ev.title })),
          ]}
          className={styles.filterSelect}
        />
      </div>

      <section className={styles.statsGrid}>
        <StatCard
          value={stats?.totalStudents ?? '-'}
          label="Active Students"
          loading={statsLoading}
        />
        <StatCard
          value={stats?.eventsThisMonth ?? '-'}
          label="Events This Month"
          loading={statsLoading}
        />
        <StatCard
          value={stats?.activeSanctions ?? '-'}
          label="Active Sanctions"
          loading={statsLoading}
        />
        <StatCard
          value={stats ? `₱${stats.totalOutstanding.toLocaleString()}` : '-'}
          label="Outstanding Balance"
          loading={statsLoading}
        />
      </section>

      <section className={styles.trendSection}>
        <div className={styles.tableCard}>
          <div className={styles.tableCardHeader}>
            <div className={styles.tableCardTitle}>Recent Attendance</div>
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by name, ID, event..."
              className={styles.tableSearch}
            />
          </div>
          <div className={styles.tableCardBody}>
            <DataTable
              columns={COLUMNS}
              data={paginatedAttendance}
              getRowId={(r) => r.id}
              loading={tableLoading}
              className={styles.tableCardTable}
              pagination={
                filteredAttendance.length > 0
                  ? {
                      page: clampedPage,
                      pageCount,
                      onPageChange: setCurrentPage,
                    }
                  : undefined
              }
            />
          </div>
        </div>
        <div className={styles.sidePanel}>
          <StatusBreakdownDonut
            data={donutData.data}
            total={donutData.total}
            loading={chartTrendLoading}
            title="Status"
            subtitle="Present / Late / Absent"
            compact
          />
          <BalanceStatusChart
            data={balanceData}
            loading={chartTrendLoading}
            title="Balances"
            subtitle="Unpaid / Partial / Paid"
            compact
          />
        </div>
      </section>

      <section className={styles.bottomSection}>
        <EventAttendanceBarChart
          data={barChartData}
          loading={chartEventLoading}
          title="Attendance by Event"
          subtitle="Per-event rate"
        />
        <AttendanceTrendChart
          data={trendData}
          loading={chartTrendLoading}
          title="Attendance Trend"
          subtitle="Daily attendance rate over time"
          height={280}
        />
      </section>
    </div>
  )
}