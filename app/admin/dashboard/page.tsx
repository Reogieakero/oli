'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient, ApiError } from '@/lib/apiClient'
import { StatCard } from '@/components/ui/StatCard/StatCard'
import { Badge } from '@/components/ui/Badge/Badge'
import { SearchBar } from '@/components/ui/SearchBar/SearchBar'
import { AttendanceTrendChart } from '@/components/charts/AttendanceTrendChart/AttendanceTrendChart'
import { EventAttendanceBarChart } from '@/components/charts/EventAttendanceBarChart/EventAttendanceBarChart'
import { StatusBreakdownDonut } from '@/components/charts/StatusBreakdownDonut/StatusBreakdownDonut'
import { BalanceStatusChart } from '@/components/charts/BalanceStatusChart/BalanceStatusChart'
import { DataTable, type Column } from '@/components/ui/DataTable/DataTable'
import styles from './page.module.css'

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
  const [data, setData] = useState<DashboardData | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [chartTrendLoading, setChartTrendLoading] = useState(true)
  const [chartEventLoading, setChartEventLoading] = useState(true)
  const [tableLoading, setTableLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

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

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  const stats = data?.stats
  const totalAttendance =
    (data?.attendanceBreakdown.present ?? 0) +
    (data?.attendanceBreakdown.late ?? 0) +
    (data?.attendanceBreakdown.absent ?? 0)

  const donutData = data
    ? [
        { name: 'Present', value: data.attendanceBreakdown.present, color: '' },
        { name: 'Late', value: data.attendanceBreakdown.late, color: '' },
        { name: 'Absent', value: data.attendanceBreakdown.absent, color: '' },
      ]
    : []

  const balanceData = data
    ? [
        { name: 'Unpaid', value: data.balanceBreakdown.unpaid, color: '' },
        { name: 'Partial', value: data.balanceBreakdown.partial, color: '' },
        { name: 'Paid', value: data.balanceBreakdown.paid, color: '' },
      ]
    : []

  const filteredAttendance = data?.recentAttendance.filter(
    (row) =>
      row.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.event.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.course.toLowerCase().includes(searchQuery.toLowerCase())
  ) ?? []

  return (
    <div className={styles.page}>
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
              data={filteredAttendance}
              getRowId={(r) => r.id}
              loading={tableLoading}
              className={styles.tableCardTable}
              pagination={
                data && filteredAttendance.length > 0
                  ? { page: 1, pageCount: 1, onPageChange: () => {} }
                  : undefined
              }
            />
          </div>
        </div>
        <div className={styles.sidePanel}>
          <StatusBreakdownDonut
            data={donutData}
            total={totalAttendance}
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
          data={(data?.attendanceTrend ?? []).map((d) => ({
            name: d.date,
            presentRate: d.presentRate,
          }))}
          loading={chartEventLoading}
          title="Attendance by Event"
          subtitle="Per-event rate"
        />
        <AttendanceTrendChart
          data={data?.attendanceTrend ?? []}
          loading={chartTrendLoading}
          title="Attendance Trend"
          subtitle="Daily attendance rate over time"
          height={280}
        />
      </section>
    </div>
  )
}