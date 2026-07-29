'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { apiClient, ApiError } from '@/lib/apiClient'
import { Button } from '@/components/ui/Button/Button'
import { Select, type SelectOption } from '@/components/ui/Select/Select'
import { DatePicker } from '@/components/ui/DatePicker/DatePicker'
import { Tabs, type Tab } from '@/components/ui/Tabs/Tabs'
import { Card, CardBody, CardHeader } from '@/components/ui/Card/Card'
import { StatCard } from '@/components/ui/StatCard/StatCard'
import { DataTable, type Column } from '@/components/ui/DataTable/DataTable'
import { Badge } from '@/components/ui/Badge/Badge'
import styles from './page.module.css'

type ReportType = 'balances' | 'sanctions'

interface BalanceRow {
  id: string
  studentName: string
  studentId: string
  course: string
  description: string
  amount: number
  status: string
  dueDate: string
  createdAt: string
}

interface BalanceStats {
  unpaid: number
  partial: number
  paid: number
  totalOutstanding: number
  totalCollected: number
}

interface BalanceReportData {
  data: BalanceRow[]
  total: number
  page: number
  limit: number
  stats: BalanceStats
}

interface SanctionRow {
  id: string
  studentName: string
  studentId: string
  course: string
  type: string
  sanctionLevel: number
  status: string
  triggeredAt: string
}

interface SanctionStats {
  totalActive: number
  bySeverity: { level: number; count: number }[]
  byType: { type: string; count: number }[]
}

interface SanctionReportData {
  data: SanctionRow[]
  total: number
  page: number
  limit: number
  stats: SanctionStats
}

interface CourseOption {
  id: string
  code: string
  name: string
}

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  unpaid: 'danger',
  partial: 'warning',
  paid: 'success',
  active: 'danger',
  superseded: 'neutral',
  lifted: 'success',
}

const REPORT_TABS: Tab[] = [
  { id: 'balances', label: 'Balances' },
  { id: 'sanctions', label: 'Sanctions' },
]

function generateFileName(type: ReportType): string {
  const now = new Date()
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return `${type}-report-${date}.pdf`
}

function generateInterpretation(type: ReportType, stats: BalanceStats | SanctionStats): string {
  if (type === 'balances') {
    const s = stats as BalanceStats
    const total = s.unpaid + s.partial + s.paid
    const unpaidPct = total > 0 ? ((s.unpaid / total) * 100).toFixed(1) : '0.0'
    const partialPct = total > 0 ? ((s.partial / total) * 100).toFixed(1) : '0.0'
    const paidPct = total > 0 ? ((s.paid / total) * 100).toFixed(1) : '0.0'
    return `Total outstanding balance is ₱${s.totalOutstanding.toLocaleString()} across ${total} entries. ${s.unpaid} (${unpaidPct}%) are unpaid, ${s.partial} (${partialPct}%) are partially paid, and ${s.paid} (${paidPct}%) are fully paid. Total collected: ₱${s.totalCollected.toLocaleString()}.`
  }

  const s = stats as SanctionStats
  const severity = s.bySeverity
  const mostCommonLevel = severity.length > 0
    ? severity.reduce((a, b) => (a.count > b.count ? a : b)).level
    : 'N/A'
  const total = s.totalActive
  const absence = s.byType.find((t) => t.type === 'absence')?.count ?? 0
  const late = s.byType.find((t) => t.type === 'late')?.count ?? 0
  const typeTotal = absence + late
  const absencePct = typeTotal > 0 ? ((absence / typeTotal) * 100).toFixed(1) : '0.0'
  const latePct = typeTotal > 0 ? ((late / typeTotal) * 100).toFixed(1) : '0.0'
  return `Total active sanctions: ${total}. Absence-related: ${absence} (${absencePct}%). Late-related: ${late} (${latePct}%). The most common sanction level is Level ${mostCommonLevel}.`
}

export default function AdminReportsPage() {
  const router = useRouter()

  const [reportType, setReportType] = useState<ReportType>('balances')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [courseId, setCourseId] = useState('')
  const [courseOptions, setCourseOptions] = useState<SelectOption[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [generated, setGenerated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [balanceData, setBalanceData] = useState<BalanceReportData | null>(null)
  const [sanctionData, setSanctionData] = useState<SanctionReportData | null>(null)

  useEffect(() => {
    async function loadCourses() {
      try {
        const res = await apiClient<{ data: CourseOption[] }>('/courses?limit=20', { authenticated: true })
        setCourseOptions(res.data.map((c) => ({ value: c.id, label: c.code })))
      } catch { /* ignore */ }
    }
    loadCourses()
  }, [])

  const statusOptions: SelectOption[] = useMemo(() => {
    if (reportType === 'balances') {
      return [
        { value: '', label: 'All Statuses' },
        { value: 'unpaid', label: 'Unpaid' },
        { value: 'partial', label: 'Partial' },
        { value: 'paid', label: 'Paid' },
      ]
    }
    return [
      { value: '', label: 'All Statuses' },
      { value: 'active', label: 'Active' },
      { value: 'superseded', label: 'Superseded' },
      { value: 'lifted', label: 'Lifted' },
    ]
  }, [reportType])

  const typeOptions: SelectOption[] = [
    { value: '', label: 'All Types' },
    { value: 'absence', label: 'Absence' },
    { value: 'late', label: 'Late' },
  ]

  const handleTabChange = useCallback((id: string) => {
    setReportType(id as ReportType)
    setGenerated(false)
    setPage(1)
    setBalanceData(null)
    setSanctionData(null)
  }, [])

  const handleGenerate = useCallback(async () => {
    setLoading(true)
    setGenerated(false)
    setPage(1)
    try {
      if (reportType === 'balances') {
        const params = new URLSearchParams()
        if (startDate) params.set('startDate', startDate)
        if (endDate) params.set('endDate', endDate)
        if (courseId) params.set('courseId', courseId)
        if (statusFilter) params.set('status', statusFilter)
        params.set('page', '1')
        params.set('limit', '20')
        const result = await apiClient<BalanceReportData>(`/reports/balances?${params.toString()}`, { authenticated: true })
        setBalanceData(result)
      } else {
        const params = new URLSearchParams()
        if (startDate) params.set('startDate', startDate)
        if (endDate) params.set('endDate', endDate)
        if (courseId) params.set('courseId', courseId)
        if (typeFilter) params.set('type', typeFilter)
        params.set('page', '1')
        params.set('limit', '20')
        const result = await apiClient<SanctionReportData>(`/reports/sanctions-stats?${params.toString()}`, { authenticated: true })
        setSanctionData(result)
      }
      setGenerated(true)
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 401) {
        router.replace('/admin-login')
      }
    } finally {
      setLoading(false)
    }
  }, [reportType, startDate, endDate, courseId, statusFilter, typeFilter, router])

  const handlePageChange = useCallback(async (newPage: number) => {
    setPage(newPage)
    setLoading(true)
    try {
      if (reportType === 'balances' && balanceData) {
        const params = new URLSearchParams()
        if (startDate) params.set('startDate', startDate)
        if (endDate) params.set('endDate', endDate)
        if (courseId) params.set('courseId', courseId)
        if (statusFilter) params.set('status', statusFilter)
        params.set('page', String(newPage))
        params.set('limit', '20')
        const result = await apiClient<BalanceReportData>(`/reports/balances?${params.toString()}`, { authenticated: true })
        setBalanceData(result)
      } else if (sanctionData) {
        const params = new URLSearchParams()
        if (startDate) params.set('startDate', startDate)
        if (endDate) params.set('endDate', endDate)
        if (courseId) params.set('courseId', courseId)
        if (typeFilter) params.set('type', typeFilter)
        params.set('page', String(newPage))
        params.set('limit', '20')
        const result = await apiClient<SanctionReportData>(`/reports/sanctions-stats?${params.toString()}`, { authenticated: true })
        setSanctionData(result)
      }
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [reportType, startDate, endDate, courseId, statusFilter, typeFilter, balanceData, sanctionData])

  const balanceColumns: Column<BalanceRow>[] = useMemo(() => [
    { key: 'studentName', header: 'Student', sortable: true },
    { key: 'studentId', header: 'ID', sortable: true },
    { key: 'course', header: 'Course', sortable: true },
    { key: 'description', header: 'Description' },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      render: (row) => `₱${row.amount.toLocaleString()}`,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => (
        <Badge variant={STATUS_BADGE[row.status] ?? 'neutral'}>{row.status}</Badge>
      ),
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      sortable: true,
      render: (row) => row.dueDate ? new Date(row.dueDate).toLocaleDateString() : '-',
    },
  ], [])

  const sanctionColumns: Column<SanctionRow>[] = useMemo(() => [
    { key: 'studentName', header: 'Student', sortable: true },
    { key: 'studentId', header: 'ID', sortable: true },
    { key: 'course', header: 'Course', sortable: true },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      render: (row) => (
        <Badge variant={row.type === 'absence' ? 'danger' : 'warning'}>{row.type}</Badge>
      ),
    },
    {
      key: 'sanctionLevel',
      header: 'Level',
      sortable: true,
      render: (row) => `Level ${row.sanctionLevel}`,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => (
        <Badge variant={STATUS_BADGE[row.status] ?? 'neutral'}>{row.status}</Badge>
      ),
    },
    {
      key: 'triggeredAt',
      header: 'Triggered',
      sortable: true,
      render: (row) => new Date(row.triggeredAt).toLocaleDateString(),
    },
  ], [])

  const currentData = reportType === 'balances' ? balanceData : sanctionData
  const currentColumns = reportType === 'balances' ? balanceColumns : sanctionColumns
  const currentStats = balanceData?.stats ?? sanctionData?.stats ?? null
  const currentRows = currentData?.data ?? []
  const totalRecords = currentData?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(totalRecords / 20))

  const handleExportPDF = useCallback(() => {
    const doc = new jsPDF()
    const title = `${reportType === 'balances' ? 'Balances' : 'Sanctions'} Report`

    doc.setFontSize(16)
    doc.text(title, 14, 20)

    const dateStr = `Generated: ${new Date().toLocaleDateString()}`
    doc.setFontSize(10)
    doc.text(dateStr, 14, 28)

    const tableColumn = currentColumns.map((c) => c.header)
    const tableRows = currentRows.map((row) =>
      reportType === 'balances'
        ? [
            (row as BalanceRow).studentName,
            (row as BalanceRow).studentId,
            (row as BalanceRow).course,
            (row as BalanceRow).description,
            `₱${(row as BalanceRow).amount.toLocaleString()}`,
            (row as BalanceRow).status,
            (row as BalanceRow).dueDate ? new Date((row as BalanceRow).dueDate).toLocaleDateString() : '-',
          ]
        : [
            (row as SanctionRow).studentName,
            (row as SanctionRow).studentId,
            (row as SanctionRow).course,
            (row as SanctionRow).type,
            `Level ${(row as SanctionRow).sanctionLevel}`,
            (row as SanctionRow).status,
            new Date((row as SanctionRow).triggeredAt).toLocaleDateString(),
          ]
    )

    autoTable(doc, {
      startY: 34,
      head: [tableColumn],
      body: tableRows,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [55, 65, 81] },
    })

    const finalY = (doc as any).lastAutoTable.finalY + 10

    doc.setFontSize(11)
    doc.text('Interpretation', 14, finalY)
    doc.setFontSize(9)
    const interpretation = generateInterpretation(reportType, currentStats!)
    const lines = doc.splitTextToSize(interpretation, 180)
    doc.text(lines, 14, finalY + 6)

    doc.save(generateFileName(reportType))
  }, [reportType, currentColumns, currentRows, currentStats])

  const displayStats = currentStats
    ? reportType === 'balances'
      ? (() => {
          const s = currentStats as BalanceStats
          const total = s.unpaid + s.partial + s.paid
          return [
            { value: total, label: 'Total Entries' },
            { value: s.unpaid, label: 'Unpaid' },
            { value: s.partial, label: 'Partial' },
            { value: s.paid, label: 'Paid' },
            { value: `₱${s.totalOutstanding.toLocaleString()}`, label: 'Outstanding' },
            { value: `₱${s.totalCollected.toLocaleString()}`, label: 'Collected' },
          ]
        })()
      : (() => {
          const s = currentStats as SanctionStats
          return [
            { value: s.totalActive, label: 'Active Sanctions' },
            ...s.bySeverity.map((sv) => ({ value: sv.count, label: `Level ${sv.level}` })),
            ...s.byType.map((t) => ({ value: t.count, label: `${t.type.charAt(0).toUpperCase() + t.type.slice(1)}` })),
          ]
        })()
    : []

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Reports</h1>
        {generated && currentRows.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            Export PDF
          </Button>
        )}
      </div>

      <Tabs tabs={REPORT_TABS} activeId={reportType} onChange={handleTabChange} />

      <div className={styles.filterSection}>
        <div className={styles.filterGrid}>
          <div className={styles.filterItem}>
            <label className={styles.filterLabel}>Start Date</label>
            <DatePicker value={startDate} onChange={setStartDate} placeholder="From date" />
          </div>
          <div className={styles.filterItem}>
            <label className={styles.filterLabel}>End Date</label>
            <DatePicker value={endDate} onChange={setEndDate} placeholder="To date" />
          </div>
          <div className={styles.filterItem}>
            <label className={styles.filterLabel}>Course</label>
            <Select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              options={[{ value: '', label: 'All Courses' }, ...courseOptions]}
              placeholder="All Courses"
            />
          </div>
          {(reportType === 'sanctions') && (
            <div className={styles.filterItem}>
              <label className={styles.filterLabel}>Type</label>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                options={typeOptions}
                placeholder="All Types"
              />
            </div>
          )}
          <div className={styles.filterItem}>
            <label className={styles.filterLabel}>Status</label>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={statusOptions}
              placeholder="All Statuses"
            />
          </div>
          <div className={styles.filterAction}>
            <Button variant="primary" size="md" onClick={handleGenerate} disabled={loading}>
              {loading ? 'Generating...' : 'Generate'}
            </Button>
          </div>
        </div>
      </div>

      {!generated && !loading && (
        <div className={styles.emptyState}>
          Select filters and click <strong>Generate</strong> to view the report.
        </div>
      )}

      {loading && (
        <div className={styles.statsGrid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCard key={i} value="" label="" loading />
          ))}
        </div>
      )}

      {generated && currentData && (
        <>
          <div className={styles.statsGrid}>
            {displayStats.map((stat, i) => (
              <StatCard key={i} value={stat.value} label={stat.label} />
            ))}
          </div>

          <Card>
            <CardBody>
              {reportType === 'balances' && balanceData && (
                <DataTable<BalanceRow>
                  columns={balanceColumns}
                  data={balanceData.data}
                  getRowId={(r) => r.id}
                  loading={loading}
                  emptyState={<span>No records found for the selected filters.</span>}
                  pagination={totalRecords > 20 ? { page, pageCount, onPageChange: handlePageChange } : undefined}
                />
              )}
              {reportType === 'sanctions' && sanctionData && (
                <DataTable<SanctionRow>
                  columns={sanctionColumns}
                  data={sanctionData.data}
                  getRowId={(r) => r.id}
                  loading={loading}
                  emptyState={<span>No records found for the selected filters.</span>}
                  pagination={totalRecords > 20 ? { page, pageCount, onPageChange: handlePageChange } : undefined}
                />
              )}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  )
}
