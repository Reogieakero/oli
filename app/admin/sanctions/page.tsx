'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient, ApiError } from '@/lib/apiClient'
import { Button } from '@/components/ui/Button/Button'
import { Badge } from '@/components/ui/Badge/Badge'
import { SearchBar } from '@/components/ui/SearchBar/SearchBar'
import { Select, type SelectOption } from '@/components/ui/Select/Select'
import { DataTable, type Column } from '@/components/ui/DataTable/DataTable'
import { Dialog } from '@/components/ui/Dialog/Dialog'
import { Input } from '@/components/ui/Input/Input'
import { StatCard } from '@/components/ui/StatCard/StatCard'
import { useToast } from '@/components/ui/Toast/Toast'
import styles from './page.module.css'

const PAGE_SIZE = 25

interface StudentInfo {
  id: string
  firstName: string
  lastName: string
  studentId: string
  course: { id: string; code: string; name: string } | null
}

interface SanctionRuleInfo {
  id: string
  type: string
  sanctionLevel: string
  absenceThreshold: number
  description: string | null
  isActive: boolean
}

interface SanctionInfo {
  id: string
  studentId: string
  sanctionRuleId: string
  status: string
  triggeredAt: string
  notes: string | null
  issuedById: string | null
}

interface StudentSanctionRow {
  student: StudentInfo
  type: string
  count: number
  bestRule: SanctionRuleInfo | null
  activeSanction: SanctionInfo | null
  currentRule: SanctionRuleInfo | null
  hasActive: boolean
}

interface ListResponse {
  data: StudentSanctionRow[]
  total: number
  page: number
  limit: number
}

interface SanctionSummary {
  active: number
  totalStudents: number
  bySeverity: { level: string; count: number }[]
  byType: { type: string; count: number }[]
  byLevel: { status: string; _count: number }[]
}

interface StatusChange {
  id: string
  oldStatus: string | null
  newStatus: string
  reason: string | null
  createdAt: string
  changedBy: { id: string; fullName: string } | null
}

interface FlaggedStudent {
  student: StudentInfo
  type: string
  count: number
  nextThreshold: number | null
  nextLevel: string | null
  nearestRule: { id: string; type: string; sanctionLevel: string; absenceThreshold: number } | null
}

const STATUS_BADGE: Record<string, 'warning' | 'success' | 'neutral'> = {
  active: 'warning',
  superseded: 'neutral',
  lifted: 'success',
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString()
}

export default function AdminSanctionsPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [rows, setRows] = useState<StudentSanctionRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const [summary, setSummary] = useState<SanctionSummary | null>(null)
  const [sanctionRules, setSanctionRules] = useState<SanctionRuleInfo[]>([])

  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterLevel, setFilterLevel] = useState('')
  const [filterType, setFilterType] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const [detailRow, setDetailRow] = useState<StudentSanctionRow | null>(null)
  const [detailEditStatus, setDetailEditStatus] = useState('active')
  const [detailEditNotes, setDetailEditNotes] = useState('')
  const [detailEditReason, setDetailEditReason] = useState('')
  const [detailSaving, setDetailSaving] = useState(false)
  const [detailChanges, setDetailChanges] = useState<StatusChange[]>([])
  const [detailChangesLoading, setDetailChangesLoading] = useState(false)

  const [rulesOpen, setRulesOpen] = useState(false)
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)
  const [ruleType, setRuleType] = useState('absence')
  const [ruleThreshold, setRuleThreshold] = useState('')
  const [ruleLevel, setRuleLevel] = useState('')
  const [ruleDescription, setRuleDescription] = useState('')
  const [ruleSubmitting, setRuleSubmitting] = useState(false)
  const [deleteRuleTarget, setDeleteRuleTarget] = useState<SanctionRuleInfo | null>(null)
  const [ruleDeleting, setRuleDeleting] = useState(false)

  const [flaggedStudents, setFlaggedStudents] = useState<FlaggedStudent[]>([])
  const [flaggedOpen, setFlaggedOpen] = useState(false)
  const [flaggedLoading, setFlaggedLoading] = useState(false)
  const [autoTriggering, setAutoTriggering] = useState(false)

  const fetchSanctions = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(currentPage))
      params.set('limit', String(PAGE_SIZE))
      if (searchQuery) params.set('search', searchQuery)
      if (filterStatus) params.set('status', filterStatus)
      if (filterLevel) params.set('sanctionLevel', filterLevel)
      if (filterType) params.set('type', filterType)

      const result = await apiClient<ListResponse>(`/sanctions?${params.toString()}`, { authenticated: true })
      setRows(result.data)
      setTotal(result.total)
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 401) router.replace('/admin-login')
    } finally {
      setLoading(false)
    }
  }, [router, currentPage, searchQuery, filterStatus, filterLevel, filterType])

  const fetchSummary = useCallback(async () => {
    try {
      const result = await apiClient<SanctionSummary>('/sanctions/summary', { authenticated: true })
      setSummary(result)
    } catch { /* silently fail */ }
  }, [])

  const fetchSanctionRules = useCallback(async () => {
    try {
      const result = await apiClient<{ data: SanctionRuleInfo[] }>('/sanctions/rules', { authenticated: true })
      setSanctionRules(result.data)
    } catch { /* silently fail */ }
  }, [])

  const fetchFlagged = useCallback(async () => {
    setFlaggedLoading(true)
    try {
      const result = await apiClient<{ data: FlaggedStudent[] }>('/sanctions/flagged', { authenticated: true })
      setFlaggedStudents(result.data)
    } catch { /* silently fail */ }
    setFlaggedLoading(false)
  }, [])

  const fetchChanges = useCallback(async (sanctionId: string) => {
    setDetailChangesLoading(true)
    try {
      const result = await apiClient<{ data: StatusChange[] }>(`/sanctions/${sanctionId}/changes`, { authenticated: true })
      setDetailChanges(result.data)
    } catch { /* silently fail */ }
    setDetailChangesLoading(false)
  }, [])

  useEffect(() => {
    fetchSanctions()
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current) }
  }, [fetchSanctions])

  useEffect(() => {
    fetchSummary()
    fetchSanctionRules()
  }, [fetchSummary, fetchSanctionRules])

  const levelOptions: SelectOption[] = useMemo(
    () => [
      { value: '', label: 'All Levels' },
      ...sanctionRules.map((r) => ({ value: r.sanctionLevel, label: r.sanctionLevel })),
    ],
    [sanctionRules]
  )

  const typeOptions: SelectOption[] = [
    { value: '', label: 'All Types' },
    { value: 'absence', label: 'Absence' },
    { value: 'late', label: 'Late' },
  ]

  const ruleTypeOptions: SelectOption[] = [
    { value: 'absence', label: 'Absence' },
    { value: 'late', label: 'Late' },
  ]

  const statusOptions: SelectOption[] = [
    { value: '', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'superseded', label: 'Superseded' },
    { value: 'lifted', label: 'Lifted' },
  ]

  const editStatusOptions: SelectOption[] = [
    { value: 'active', label: 'Active' },
    { value: 'superseded', label: 'Superseded' },
    { value: 'lifted', label: 'Lifted' },
  ]

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSearchChange = useCallback((q: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      setSearchQuery(q)
      setCurrentPage(1)
    }, 250)
  }, [])

  const openDetail = useCallback((row: StudentSanctionRow) => {
    setDetailRow(row)
    setDetailEditStatus(row.activeSanction?.status || 'active')
    setDetailEditNotes(row.activeSanction?.notes || '')
    setDetailEditReason('')
    if (row.activeSanction) fetchChanges(row.activeSanction.id)
    else setDetailChanges([])
  }, [fetchChanges])

  const handleCloseDetail = useCallback(() => setDetailRow(null), [])

  const handleDetailSave = useCallback(async () => {
    if (!detailRow?.activeSanction) return
    const body: Record<string, unknown> = {}
    if (detailEditStatus !== detailRow.activeSanction.status) body.status = detailEditStatus
    if (detailEditNotes !== (detailRow.activeSanction.notes || '')) body.notes = detailEditNotes || null
    if (detailEditReason) body.reason = detailEditReason
    if (Object.keys(body).length === 0) { setDetailRow(null); return }
    setDetailSaving(true)
    try {
      await apiClient(`/sanctions/${detailRow.activeSanction.id}`, { method: 'PATCH', body, authenticated: true })
      toast({ message: 'Sanction updated', variant: 'success' })
      setDetailRow(null)
      fetchSanctions()
      fetchSummary()
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : 'Failed to update sanction', variant: 'error' })
    } finally {
      setDetailSaving(false)
    }
  }, [detailRow, detailEditStatus, detailEditNotes, detailEditReason, toast, fetchSanctions, fetchSummary])

  const handleExport = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filterStatus) params.set('status', filterStatus)
      if (filterType) params.set('type', filterType)
      if (searchQuery) params.set('search', searchQuery)
      const result = await apiClient<{ data: Record<string, string>[] }>(`/sanctions/export?${params.toString()}`, { authenticated: true })
      if (result.data.length === 0) { toast({ message: 'No data to export', variant: 'info' }); return }
      const headers = Object.keys(result.data[0])
      const csvRows = [headers.join(','), ...result.data.map((row) => headers.map((h) => `"${(row[h] || '').replace(/"/g, '""')}"`).join(','))]
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `sanctions-export-${new Date().toISOString().split('T')[0]}.csv`
      a.click(); URL.revokeObjectURL(url)
      toast({ message: 'Export downloaded', variant: 'success' })
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : 'Export failed', variant: 'error' })
    }
  }, [filterStatus, filterType, searchQuery, toast])

  const handleAutoTrigger = useCallback(async () => {
    setAutoTriggering(true)
    try {
      const result = await apiClient<{ created: number; upgraded: number }>('/sanctions/auto-trigger', { method: 'POST', authenticated: true })
      toast({ message: `${result.created} created, ${result.upgraded} upgraded`, variant: 'success' })
      fetchSanctions()
      fetchSummary()
      fetchFlagged()
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : 'Auto-trigger failed', variant: 'error' })
    } finally {
      setAutoTriggering(false)
    }
  }, [toast, fetchSanctions, fetchSummary, fetchFlagged])

  const openRules = useCallback(() => {
    resetRuleForm()
    setRulesOpen(true)
  }, [])

  const resetRuleForm = useCallback(() => {
    setEditingRuleId(null)
    setRuleType('absence')
    setRuleThreshold('')
    setRuleLevel('')
    setRuleDescription('')
  }, [])

  const startEditRule = useCallback((r: SanctionRuleInfo) => {
    setEditingRuleId(r.id)
    setRuleType(r.type)
    setRuleThreshold(String(r.absenceThreshold))
    setRuleLevel(r.sanctionLevel)
    setRuleDescription(r.description || '')
  }, [])

  const handleSaveRule = useCallback(async () => {
    if (!ruleThreshold || !ruleLevel.trim()) return
    setRuleSubmitting(true)
    try {
      const body = { type: ruleType, absenceThreshold: parseInt(ruleThreshold, 10), sanctionLevel: ruleLevel.trim(), description: ruleDescription.trim() || null }
      if (editingRuleId) {
        await apiClient(`/sanctions/rules/${editingRuleId}`, { method: 'PUT', body, authenticated: true })
        toast({ message: 'Rule updated', variant: 'success' })
      } else {
        await apiClient('/sanctions/rules', { method: 'POST', body, authenticated: true })
        toast({ message: 'Rule created', variant: 'success' })
      }
      resetRuleForm()
      fetchSanctionRules()
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : 'Failed to save rule', variant: 'error' })
    } finally {
      setRuleSubmitting(false)
    }
  }, [editingRuleId, ruleType, ruleThreshold, ruleLevel, ruleDescription, toast, fetchSanctionRules, resetRuleForm])

  const confirmDeleteRule = useCallback(async () => {
    if (!deleteRuleTarget) return
    setRuleDeleting(true)
    try {
      await apiClient(`/sanctions/rules/${deleteRuleTarget.id}`, { method: 'DELETE', authenticated: true })
      toast({ message: 'Rule deleted', variant: 'success' })
      setDeleteRuleTarget(null)
      fetchSanctionRules()
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : 'Failed to delete rule', variant: 'error' })
    } finally {
      setRuleDeleting(false)
    }
  }, [deleteRuleTarget, toast, fetchSanctionRules])

  const columnDefs: Column<StudentSanctionRow>[] = useMemo(() => [
    {
      key: 'studentName',
      header: 'Student',
      render: (row) => `${row.student.firstName} ${row.student.lastName}`,
    },
    { key: 'studentId', header: 'ID', render: (row) => row.student.studentId },
    {
      key: 'course',
      header: 'Course',
      render: (row) =>
        row.student.course ? <Badge variant="brand">{row.student.course.code}</Badge> : <span className={styles.muted}>—</span>,
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => <Badge variant={row.type === 'absence' ? 'danger' : 'warning'}>{row.type}</Badge>,
    },
    {
      key: 'count',
      header: 'Count',
      render: (row) => {
        const level = row.bestRule?.absenceThreshold
        return <Badge variant={level && row.count === level ? 'danger' : 'neutral'}>{row.count}</Badge>
      },
    },
    {
      key: 'sanctionLevel',
      header: 'Sanction',
      render: (row) =>
        row.hasActive && row.currentRule
          ? <Badge variant="danger">{row.currentRule.sanctionLevel}</Badge>
          : <span className={styles.muted}>—</span>,
    },
    {
      key: 'threshold',
      header: 'Threshold',
      render: (row) =>
        row.bestRule ? `${row.bestRule.absenceThreshold}` : <span className={styles.muted}>—</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) =>
        row.hasActive
          ? <Badge variant={STATUS_BADGE[row.activeSanction!.status]}>{row.activeSanction!.status}</Badge>
          : <Badge variant="neutral">None</Badge>,
    },
    {
      key: 'actions',
      header: '',
      width: '80px',
      render: (row) => (
        <div className={styles.actionBtns}>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openDetail(row) }}>
            View
          </Button>
        </div>
      ),
    },
  ], [openDetail])

  const summaryCards = useMemo(() => {
    if (!summary) return null
    const sev = summary.bySeverity.slice(0, 3)
    const absCount = summary.byType.find((t) => t.type === 'absence')?.count ?? 0
    const lateCount = summary.byType.find((t) => t.type === 'late')?.count ?? 0
    return (
      <div className={styles.statsGrid}>
        <StatCard value={summary.active} label="Active Sanctions" loading={false} />
        <StatCard value={absCount} label="Absence Sanctions" loading={false} />
        <StatCard value={lateCount} label="Late Sanctions" loading={false} />
        {sev.map((s) => (
          <StatCard key={s.level} value={s.count} label={s.level} loading={false} />
        ))}
      </div>
    )
  }, [summary])

  const flaggedColumns: Column<FlaggedStudent>[] = [
    {
      key: 'studentName',
      header: 'Student',
      render: (row) => `${row.student.firstName} ${row.student.lastName}`,
    },
    { key: 'studentId', header: 'ID', render: (row) => row.student.studentId },
    {
      key: 'course',
      header: 'Course',
      render: (row) =>
        row.student.course ? <Badge variant="brand">{row.student.course.code}</Badge> : <span className={styles.muted}>—</span>,
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => <Badge variant={row.type === 'absence' ? 'danger' : 'warning'}>{row.type}</Badge>,
    },
    {
      key: 'count',
      header: 'Count',
      render: (row) => <Badge variant="warning">{row.count}</Badge>,
    },
    {
      key: 'nextThreshold',
      header: 'Triggers At',
      render: (row) => row.nextThreshold ? `${row.nextThreshold} (${row.nextLevel})` : <span className={styles.muted}>—</span>,
    },
    {
      key: 'needed',
      header: 'Needed',
      render: (row) => {
        if (!row.nextThreshold) return <span className={styles.muted}>—</span>
        const needed = row.nextThreshold - row.count
        return <span style={{ color: needed <= 1 ? 'var(--color-status-danger)' : undefined, fontWeight: needed <= 1 ? 600 : undefined }}>
          {needed > 0 ? `${needed} more` : 'Now!'}
        </span>
      },
    },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Sanctions</h1>
        <div className={styles.headerRight}>
          <Button variant="outline" onClick={() => { fetchFlagged(); setFlaggedOpen(true) }}>
            Flagged{flaggedStudents.length > 0 ? ` (${flaggedStudents.length})` : ''}
          </Button>
          <Button variant="outline" onClick={handleAutoTrigger} disabled={autoTriggering}>
            {autoTriggering && <span className={styles.spinner} />}
            {autoTriggering ? 'Checking...' : 'Auto-Check'}
          </Button>
          <Button variant="outline" onClick={handleExport}>Export CSV</Button>
          <Button variant="outline" onClick={openRules}>Rules</Button>
        </div>
      </div>

      {summaryCards}

      <div className={styles.filterBar}>
        <SearchBar defaultValue={searchQuery} onChange={handleSearchChange} placeholder="Search by name or ID..." className={styles.search} />
        <Select value={filterType} onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1) }} options={typeOptions} className={styles.filterSelect} />
        <Select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1) }} options={statusOptions} className={styles.filterSelect} />
        <Select value={filterLevel} onChange={(e) => { setFilterLevel(e.target.value); setCurrentPage(1) }} options={levelOptions} className={styles.filterSelect} />
      </div>

      <DataTable
        columns={columnDefs}
        data={rows}
        getRowId={(r) => `${r.student.id}-${r.type}`}
        loading={loading}
        onRowClick={(row) => openDetail(row)}
        emptyState={<div className={styles.emptyState}><p>No students found.</p></div>}
        pagination={total > 0 ? { page: currentPage, pageCount, onPageChange: setCurrentPage } : undefined}
      />

      {/* Detail Drawer */}
      <Dialog
        open={!!detailRow}
        onClose={handleCloseDetail}
        title={detailRow ? (
          <div className={styles.drawerHeader}>
            <div className={styles.drawerTitle}>{detailRow.student.firstName} {detailRow.student.lastName}</div>
            <div className={styles.drawerSubtitle}>
              <span>{detailRow.student.studentId}</span>
              {detailRow.student.course ? <Badge variant="brand">{detailRow.student.course.code}</Badge> : null}
            </div>
          </div>
        ) : undefined}
        bodyClassName={styles.detailDialogBody}
        position="right"
        footer={
          <div className={styles.dialogFooter}>
            <div />
            <div className={styles.dialogFooterRight}>
              <Button variant="outline" onClick={handleCloseDetail}>Cancel</Button>
              <Button onClick={handleDetailSave} disabled={detailSaving || !detailRow?.activeSanction}>
                {detailSaving && <span className={styles.spinner} />}
                {detailSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        }
      >
        {detailRow && (
          <div>
            {/* Overview */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>Overview</div>
              <div className={styles.grid2}>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Type</span>
                  <span className={styles.fieldValue}>
                    <Badge variant={detailRow.type === 'absence' ? 'danger' : 'warning'}>{detailRow.type}</Badge>
                  </span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Current Status</span>
                  <span className={styles.fieldValue}>
                    <span className={`${styles.statusBadge} ${
                      detailRow.activeSanction?.status === 'active' ? styles.statusBadgeActive
                      : detailRow.activeSanction?.status === 'lifted' ? styles.statusBadgeResolved
                      : styles.statusBadgeSuperseded
                    }`}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
                      {detailRow.activeSanction?.status || 'None'}
                    </span>
                  </span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Sanction Level</span>
                  <span className={styles.fieldValue}>
                    {detailRow.currentRule
                      ? <Badge variant="danger">{detailRow.currentRule.sanctionLevel}</Badge>
                      : <span className={styles.emptyMuted}>—</span>}
                  </span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Matching Rule</span>
                  <span className={styles.fieldValue}>
                    {detailRow.bestRule
                      ? `${detailRow.bestRule.absenceThreshold} ${detailRow.type} — ${detailRow.bestRule.sanctionLevel}`
                      : <span className={styles.emptyMuted}>None</span>}
                  </span>
                </div>
              </div>
            </div>

            {/* Attendance */}
            {detailRow.activeSanction && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>Attendance</div>
                <div className={styles.grid2}>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Total {detailRow.type === 'late' ? 'Lates' : 'Absences'}</span>
                    <span className={styles.fieldValue}>
                      <Badge variant={detailRow.bestRule && detailRow.count === detailRow.bestRule.absenceThreshold ? 'danger' : 'neutral'}>
                        {detailRow.count}
                      </Badge>
                    </span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Triggered At</span>
                    <span className={styles.fieldValue}>{formatDateTime(detailRow.activeSanction.triggeredAt)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Status Update */}
            {detailRow.activeSanction && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>Update Status</div>
                <div className={styles.grid2}>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Status</span>
                    <Select value={detailEditStatus} onChange={(e) => setDetailEditStatus(e.target.value)} options={editStatusOptions} className={styles.selectInline} />
                  </div>
                  {detailEditStatus !== detailRow.activeSanction.status && (
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>Reason</span>
                      <Input value={detailEditReason} onChange={(e) => setDetailEditReason(e.target.value)} placeholder="Required for status changes" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {detailRow.activeSanction && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>Notes</div>
                <textarea
                  className={styles.notesArea}
                  value={detailEditNotes}
                  onChange={(e) => setDetailEditNotes(e.target.value)}
                  placeholder="Add administrative notes..."
                />
              </div>
            )}

            {/* Timeline */}
            {detailRow.activeSanction && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>History</div>
                {detailChangesLoading ? (
                  <p className={styles.emptyMuted}>Loading...</p>
                ) : detailChanges.length === 0 ? (
                  <p className={styles.emptyMuted}>No changes recorded.</p>
                ) : (
                  <div className={styles.timeline}>
                    {[
                      { oldStatus: null, newStatus: 'active', createdAt: detailRow.activeSanction.triggeredAt, changedBy: null, reason: 'Auto-triggered' },
                      ...detailChanges,
                    ].map((c, idx) => (
                      <div key={'id' in c ? c.id : `initial-${idx}`} className={styles.timelineItem}>
                        <div>
                          <div className={`${styles.timelineDot} ${
                            c.newStatus === 'active' ? styles.timelineDotActive
                            : c.newStatus === 'lifted' ? styles.timelineDotResolved
                            : styles.timelineDotNeutral
                          }`} />
                          <div className={styles.timelineLine} />
                        </div>
                        <div className={styles.timelineContent}>
                          <div className={styles.timelineEvent}>
                            {c.newStatus === 'active' ? 'Sanction Issued'
                              : c.newStatus === 'lifted' ? 'Sanction Lifted'
                              : c.newStatus === 'superseded' ? 'Sanction Superseded'
                              : `Status changed to ${c.newStatus}`}
                          </div>
                          <div className={styles.timelineMeta}>
                            by {c.changedBy?.fullName || 'System'}
                            {c.reason ? <span> — {c.reason}</span> : null}
                          </div>
                          <div className={styles.timelineDate}>{formatDateTime(c.createdAt)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!detailRow.activeSanction && (
              <div className={styles.section}>
                <p className={styles.emptyMuted}>No active sanction for this student.</p>
              </div>
            )}
          </div>
        )}
      </Dialog>

      {/* Flagged Drawer */}
      <Dialog open={flaggedOpen} onClose={() => setFlaggedOpen(false)} title={`Flagged Students (${flaggedStudents.length})`} position="right" bodyClassName={styles.flaggedDrawerBody}
        footer={
          <div className={styles.dialogFooter}>
            <div />
            <Button variant="outline" onClick={() => setFlaggedOpen(false)}>Close</Button>
          </div>
        }
      >
        <DataTable
          columns={flaggedColumns}
          data={flaggedStudents}
          getRowId={(r) => `${r.student.id}-${r.type}`}
          loading={flaggedLoading}
          emptyState={<p className={styles.muted}>No flagged students.</p>}
        />
      </Dialog>

      {/* Manage Rules Drawer */}
      <Dialog open={rulesOpen} onClose={() => setRulesOpen(false)} title="Manage Sanction Rules" position="right" bodyClassName={styles.rulesDrawerBody}
        footer={
          <div className={styles.dialogFooter}>
            <div />
            <div className={styles.dialogFooterRight}>
              <Button variant="outline" onClick={() => { resetRuleForm(); setRulesOpen(false) }}>Close</Button>
              <Button onClick={handleSaveRule} disabled={ruleSubmitting || !ruleThreshold || !ruleLevel.trim()}>
                {ruleSubmitting && <span className={styles.spinner} />}
                {ruleSubmitting ? 'Saving...' : editingRuleId ? 'Save' : 'Add Rule'}
              </Button>
            </div>
          </div>
        }
      >
        <div className={styles.ruleFormHeader}>{editingRuleId ? 'Edit Rule' : 'Add New Rule'}</div>
        <div className={styles.ruleFormRow}>
          <div className={styles.field}>
            <label className={styles.label}>Type</label>
            <Select value={ruleType} onChange={(e) => setRuleType(e.target.value)} options={ruleTypeOptions} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Threshold</label>
            <Input value={ruleThreshold} onChange={(e) => setRuleThreshold(e.target.value)} type="number" min="1" placeholder="e.g. 3" />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Sanction Level</label>
            <Input value={ruleLevel} onChange={(e) => setRuleLevel(e.target.value)} placeholder="e.g. Warning, Suspension" />
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Description (optional)</label>
          <textarea value={ruleDescription} onChange={(e) => setRuleDescription(e.target.value)} placeholder="e.g. First warning level" className={styles.textarea} rows={2} onInput={(e) => { e.currentTarget.style.height = ''; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px' }} />
        </div>
        {editingRuleId && <Button variant="ghost" size="sm" onClick={resetRuleForm}>Cancel Editing</Button>}
        <div className={styles.rulesList}>
          {sanctionRules.map((r) => (
            <div key={r.id} className={styles.ruleRow}>
              <div className={styles.ruleInfo}>
                <span className={styles.ruleLevel}>{r.sanctionLevel}</span>
                <span className={styles.ruleMeta}>
                  <Badge variant={r.type === 'absence' ? 'danger' : 'warning'} style={{ fontSize: 11, padding: '0 4px' }}>{r.type}</Badge>
                  {' '}{r.absenceThreshold} {r.type}
                  {r.absenceThreshold > 1 ? 's' : ''}
                </span>
                {r.description && <span className={styles.ruleDesc}>{r.description}</span>}
                {!r.isActive && <span className={styles.inactiveLabel}>(inactive)</span>}
              </div>
              <div className={styles.actionBtns}>
                <Button variant="ghost" size="sm" onClick={() => startEditRule(r)}>Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteRuleTarget(r)}>Delete</Button>
              </div>
            </div>
          ))}
          {sanctionRules.length === 0 && <p className={styles.muted}>No rules defined yet.</p>}
        </div>
      </Dialog>

      {/* Delete Rule Confirmation */}
      <Dialog open={!!deleteRuleTarget} onClose={() => setDeleteRuleTarget(null)} title="Delete Sanction Rule"
        footer={
          <div className={styles.dialogFooter}>
            <Button variant="outline" onClick={() => setDeleteRuleTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeleteRule} disabled={ruleDeleting}>
              {ruleDeleting && <span className={styles.spinner} />}{ruleDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        }
      >
        <div>
          <p>Are you sure you want to delete <strong>{deleteRuleTarget?.sanctionLevel}</strong>?</p>
          <p>This is a <strong>{deleteRuleTarget?.type}</strong> rule with threshold {deleteRuleTarget?.absenceThreshold}.</p>
          <p>Existing sanctions linked to this rule will not be affected.</p>
        </div>
      </Dialog>
    </div>
  )
}
