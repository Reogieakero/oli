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

interface EventInfo {
  id: string
  title: string
  eventDate: string
  startTime: string
  venue: string
  isMandatory: boolean
  course: { id: string; code: string; name: string } | null
}

interface DisputeInfo {
  id: string
  status: string
  reason?: string
}

interface AttendanceRecord {
  id: string
  studentId: string
  eventId: string
  status: 'present' | 'late' | 'absent'
  scannedAt: string | null
  scanMethod: 'qr_scan' | 'manual' | null
  scannerDeviceId: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
  student: StudentInfo
  event: EventInfo
  dispute: DisputeInfo | null
}

interface RecordsResponse {
  data: AttendanceRecord[]
  total: number
  page: number
  limit: number
}

interface StudentOption {
  id: string
  firstName: string
  lastName: string
  studentId: string
  course: { id: string; code: string } | null
}

interface EventOption {
  id: string
  title: string
  eventDate: string
  course: { id: string; code: string } | null
}

type AttendanceStatus = 'present' | 'late' | 'absent'

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'danger'> = {
  present: 'success',
  late: 'warning',
  absent: 'danger',
}

const DISPUTE_BADGE: Record<string, 'warning' | 'success' | 'danger'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
}

function formatTime(timeStr: string): string {
  const timePart = timeStr.includes('T') ? timeStr.split('T')[1] : timeStr
  const parts = timePart.split(':')
  if (parts.length < 2) return timeStr
  const h = parseInt(parts[0], 10)
  const m = parts[1]
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${m} ${ampm}`
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString()
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString()
}

export default function AdminAttendancePage() {
  const router = useRouter()
  const { toast } = useToast()

  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const [events, setEvents] = useState<EventOption[]>([])
  const [courses, setCourses] = useState<SelectOption[]>([])
  const [allStudents, setAllStudents] = useState<StudentOption[]>([])

  const [searchQuery, setSearchQuery] = useState('')
  const [filterEventId, setFilterEventId] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCourseId, setFilterCourseId] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkProcessing, setBulkProcessing] = useState(false)

  const [detailRecord, setDetailRecord] = useState<AttendanceRecord | null>(null)
  const [detailEditStatus, setDetailEditStatus] = useState<AttendanceStatus>('present')
  const [detailEditReason, setDetailEditReason] = useState('')
  const [detailSaving, setDetailSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<AttendanceRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [disputeResolving, setDisputeResolving] = useState(false)
  const [disputeNotes, setDisputeNotes] = useState('')

  const [addOpen, setAddOpen] = useState(false)
  const [addStudentId, setAddStudentId] = useState('')
  const [addEventId, setAddEventId] = useState('')
  const [addStatus, setAddStatus] = useState<AttendanceStatus>('present')
  const [addReason, setAddReason] = useState('')
  const [addSubmitting, setAddSubmitting] = useState(false)
  const [addError, setAddError] = useState('')

  const columnDefs: Column<AttendanceRecord>[] = useMemo(() => [
    {
      key: 'studentName',
      header: 'Student',
      sortable: true,
      render: (row) => `${row.student.firstName} ${row.student.lastName}`,
    },
    { key: 'studentId', header: 'ID', sortable: true, render: (row) => row.student.studentId },
    {
      key: 'course',
      header: 'Course',
      sortable: true,
      render: (row) =>
        row.student.course ? <Badge variant="brand">{row.student.course.code}</Badge> : <span className={styles.muted}>—</span>,
    },
    {
      key: 'eventCourse',
      header: 'Event Course',
      sortable: true,
      render: (row) =>
        row.event.course ? <Badge variant="brand">{row.event.course.code}</Badge> : <span className={styles.muted}>—</span>,
    },
    { key: 'eventTitle', header: 'Event', sortable: true, render: (row) => row.event.title },
    {
      key: 'eventDate',
      header: 'Date',
      sortable: true,
      render: (row) => formatDate(row.event.eventDate),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => (
        <Badge variant={STATUS_BADGE[row.status]}>{row.status}</Badge>
      ),
    },
    {
      key: 'scannedAt',
      header: 'Scanned At',
      sortable: true,
      render: (row) => formatDateTime(row.scannedAt),
    },
    {
      key: 'scanMethod',
      header: 'Method',
      render: (row) => {
        if (!row.scanMethod) return <span className={styles.muted}>—</span>
        return row.scanMethod === 'qr_scan' ? 'QR Scan' : 'Manual'
      },
    },
    {
      key: 'dispute',
      header: 'Dispute',
      render: (row) =>
        row.dispute ? (
          <Badge variant={DISPUTE_BADGE[row.dispute.status] ?? 'neutral'}>
            {row.dispute.status}
          </Badge>
        ) : (
          <span className={styles.muted}>—</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      width: '100px',
      render: (row) => (
        <div className={styles.actionBtns}>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openDetail(row) }}>
            Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={(e) => {
            e.stopPropagation()
            setDeleteTarget(row)
          }}>
            Delete
          </Button>
        </div>
      ),
    },
  ], [])

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(currentPage))
      params.set('limit', String(PAGE_SIZE))
      params.set('sortBy', sortBy)
      params.set('sortOrder', sortOrder)
      if (filterEventId) params.set('eventId', filterEventId)
      if (filterStatus) params.set('status', filterStatus)
      if (filterCourseId) params.set('courseId', filterCourseId)
      if (searchQuery) params.set('search', searchQuery)

      const result = await apiClient<RecordsResponse>(
        `/attendance/records?${params.toString()}`,
        { authenticated: true }
      )
      setRecords(result.data)
      setTotal(result.total)
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 401) {
        router.replace('/admin-login')
      }
    } finally {
      setLoading(false)
    }
  }, [router, currentPage, sortBy, sortOrder, filterEventId, filterStatus, filterCourseId, searchQuery])

  const fetchFilters = useCallback(async () => {
    try {
      const [eventsResult, coursesResult] = await Promise.all([
        apiClient<{ data: EventOption[] }>('/events?limit=200', { authenticated: true }),
        apiClient<{ data: { id: string; code: string; name: string }[] }>('/courses?limit=200', { authenticated: true }),
      ])
      setEvents(eventsResult.data)
      setCourses([
        { value: '', label: 'All Courses' },
        ...coursesResult.data.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` })),
      ])
    } catch {
      /* silently fail */
    }
  }, [])

  const fetchStudents = useCallback(async () => {
    try {
      const result = await apiClient<{ data: StudentOption[] }>('/students', { authenticated: true })
      setAllStudents(result.data)
    } catch {
      /* silently fail */
    }
  }, [])

  useEffect(() => {
    fetchRecords()
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current) }
  }, [fetchRecords])

  useEffect(() => {
    fetchFilters()
  }, [fetchFilters])

  const eventOptions: SelectOption[] = useMemo(
    () => [{ value: '', label: 'All Events' }, ...events.map((e) => ({ value: e.id, label: e.title }))],
    [events]
  )

  const statusOptions: SelectOption[] = [
    { value: '', label: 'All Status' },
    { value: 'present', label: 'Present' },
    { value: 'late', label: 'Late' },
    { value: 'absent', label: 'Absent' },
  ]

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const summaryCounts = useMemo(() => {
    let present = 0, late = 0, absent = 0
    for (const r of records) {
      if (r.status === 'present') present++
      else if (r.status === 'late') late++
      else if (r.status === 'absent') absent++
    }
    return { present, late, absent }
  }, [records])

  const openDetail = useCallback((record: AttendanceRecord) => {
    setDetailRecord(record)
    setDetailEditStatus(record.status)
    setDetailEditReason('')
    setDisputeNotes('')
  }, [])

  const handleCloseDetail = useCallback(() => setDetailRecord(null), [])

  const handleDetailSave = useCallback(async () => {
    if (!detailRecord) return
    if (detailEditStatus === detailRecord.status) {
      setDetailRecord(null)
      return
    }
    setDetailSaving(true)
    try {
      await apiClient(`/attendance/records/${detailRecord.id}`, {
        method: 'PATCH',
        body: { status: detailEditStatus, reason: detailEditReason || undefined },
        authenticated: true,
      })
      toast({ message: 'Attendance record updated', variant: 'success' })
      setDetailRecord(null)
      fetchRecords()
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : 'Failed to update record', variant: 'error' })
    } finally {
      setDetailSaving(false)
    }
  }, [detailRecord, detailEditStatus, detailEditReason, toast, fetchRecords])

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await apiClient(`/attendance/records/${deleteTarget.id}`, {
        method: 'DELETE',
        authenticated: true,
      })
      toast({ message: 'Attendance record deleted', variant: 'success' })
      setDeleteTarget(null)
      setDetailRecord(null)
      fetchRecords()
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : 'Failed to delete record', variant: 'error' })
    } finally {
      setDeleting(false)
    }
  }, [deleteTarget, toast, fetchRecords])

  const handleResolveDispute = useCallback(async (status: 'approved' | 'rejected') => {
    if (!detailRecord || !detailRecord.dispute) return
    setDisputeResolving(true)
    try {
      await apiClient(`/disputes/${detailRecord.dispute.id}/resolve`, {
        method: 'PUT',
        body: { status, facultyNotes: disputeNotes || undefined },
        authenticated: true,
      })
      toast({ message: `Dispute ${status}`, variant: 'success' })
      setDetailRecord(null)
      fetchRecords()
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : 'Failed to resolve dispute', variant: 'error' })
    } finally {
      setDisputeResolving(false)
    }
  }, [detailRecord, disputeNotes, toast, fetchRecords])

  const handleBulkUpdate = useCallback(async (status: AttendanceStatus) => {
    if (selectedIds.size === 0) return
    setBulkProcessing(true)
    let success = 0, failed = 0
    for (const id of selectedIds) {
      try {
        await apiClient(`/attendance/records/${id}`, {
          method: 'PATCH',
          body: { status },
          authenticated: true,
        })
        success++
      } catch {
        failed++
      }
    }
    setBulkProcessing(false)
    setSelectedIds(new Set())
    if (failed === 0) {
      toast({ message: `${success} record(s) updated`, variant: 'success' })
    } else {
      toast({ message: `${success} updated, ${failed} failed`, variant: 'error' })
    }
    fetchRecords()
  }, [selectedIds, toast, fetchRecords])

  const handleAddRecord = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setAddSubmitting(true)
    setAddError('')
    try {
      await apiClient('/attendance/records', {
        method: 'POST',
        body: {
          studentId: addStudentId,
          eventId: addEventId,
          status: addStatus,
          reason: addReason || undefined,
        },
        authenticated: true,
      })
      toast({ message: 'Attendance record created', variant: 'success' })
      setAddOpen(false)
      setAddStudentId('')
      setAddEventId('')
      setAddStatus('present')
      setAddReason('')
      fetchRecords()
    } catch (err) {
      if (err instanceof ApiError) {
        setAddError(err.message)
      } else {
        setAddError('An unexpected error occurred')
      }
    } finally {
      setAddSubmitting(false)
    }
  }, [addStudentId, addEventId, addStatus, addReason, toast, fetchRecords])

  const handleSortChange = useCallback((sort: { key: string; direction: 'asc' | 'desc' } | null) => {
    if (!sort) {
      setSortBy('createdAt')
      setSortOrder('desc')
    } else {
      setSortBy(sort.key)
      setSortOrder(sort.direction)
    }
    setCurrentPage(1)
  }, [])

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleSearchChange = useCallback((q: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      setSearchQuery(q)
      setCurrentPage(1)
    }, 250)
  }, [])

  const studentOptions: SelectOption[] = useMemo(
    () => allStudents.map((s) => ({
      value: s.id,
      label: `${s.firstName} ${s.lastName} (${s.studentId})${s.course ? ` — ${s.course.code}` : ''}`,
    })),
    [allStudents]
  )

  const addEventOptions: SelectOption[] = useMemo(
    () => events.map((e) => ({
      value: e.id,
      label: `${e.title} — ${formatDate(e.eventDate)}${e.course ? ` (${e.course.code})` : ''}`,
    })),
    [events]
  )

  const statusSelectOptions: SelectOption[] = [
    { value: 'present', label: 'Present' },
    { value: 'late', label: 'Late' },
    { value: 'absent', label: 'Absent' },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Attendance</h1>
        <div className={styles.headerRight}>
          <Button onClick={() => { fetchStudents(); setAddOpen(true) }}>Add Record</Button>
        </div>
      </div>

      <div className={styles.filterBar}>
        <SearchBar
          defaultValue={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search by name, ID, event..."
          className={styles.search}
        />
        <Select
          value={filterEventId}
          onChange={(e) => { setFilterEventId(e.target.value); setCurrentPage(1) }}
          options={eventOptions}
          className={styles.filterSelect}
        />
        <Select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1) }}
          options={statusOptions}
          className={styles.filterSelect}
        />
        <Select
          value={filterCourseId}
          onChange={(e) => { setFilterCourseId(e.target.value); setCurrentPage(1) }}
          options={courses}
          className={styles.filterSelect}
        />
      </div>

      <div className={styles.summary}>
        <span className={styles.summaryItem}>
          <span className={styles.summaryValue}>{total}</span> records
        </span>
        <span className={styles.summaryBullet}>·</span>
        <span className={styles.summaryItem}>
          <span className={styles.summaryValue}>{summaryCounts.present}</span> present
        </span>
        <span className={styles.summaryBullet}>·</span>
        <span className={styles.summaryItem}>
          <span className={styles.summaryValue}>{summaryCounts.late}</span> late
        </span>
        <span className={styles.summaryBullet}>·</span>
        <span className={styles.summaryItem}>
          <span className={styles.summaryValue}>{summaryCounts.absent}</span> absent
        </span>
      </div>

      {selectedIds.size > 0 && (
        <div className={styles.bulkBar}>
          <span className={styles.bulkCount}>{selectedIds.size}</span> selected
          <Button size="sm" variant="outline" onClick={() => handleBulkUpdate('present')} disabled={bulkProcessing}>
            Mark Present
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleBulkUpdate('late')} disabled={bulkProcessing}>
            Mark Late
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleBulkUpdate('absent')} disabled={bulkProcessing}>
            Mark Absent
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} disabled={bulkProcessing}>
            Clear
          </Button>
        </div>
      )}

      <DataTable
        columns={columnDefs}
        data={records}
        getRowId={(r) => r.id}
        loading={loading}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        sortState={sortBy ? { key: sortBy, direction: sortOrder } : null}
        onSortChange={handleSortChange}
        onRowClick={openDetail}
        emptyState={
          <div className={styles.emptyState}>
            <p>No attendance records found.</p>
          </div>
        }
        pagination={
          total > 0
            ? { page: currentPage, pageCount, onPageChange: setCurrentPage }
            : undefined
        }
      />

      {/* Detail / Edit Dialog */}
      <Dialog
        open={!!detailRecord}
        onClose={handleCloseDetail}
        title={detailRecord ? (
          <div className={styles.drawerHeader}>
            <div className={styles.drawerTitle}>{detailRecord.student.firstName} {detailRecord.student.lastName}</div>
            <div className={styles.drawerSubtitle}>
              <span>{detailRecord.student.studentId}</span>
              {detailRecord.student.course ? (
                <Badge variant="brand">{detailRecord.student.course.code}</Badge>
              ) : null}
            </div>
          </div>
        ) : undefined}
        bodyClassName={styles.detailDialogBody}
        position="right"
        footer={
          <div className={styles.dialogFooter}>
            <div>
              {detailRecord && (
                <Button variant="destructive" onClick={() => { setDetailRecord(null); setDeleteTarget(detailRecord) }}>
                  Delete
                </Button>
              )}
            </div>
            <div className={styles.dialogFooterRight}>
              <Button variant="outline" onClick={() => setDetailRecord(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleDetailSave}
                disabled={detailSaving || !detailRecord || detailEditStatus === detailRecord.status}
              >
                {detailSaving && <span className={styles.spinner} />}
                {detailSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        }
      >
        {detailRecord && (
          <div className={styles.detailGridPro}>
            <div className={styles.detailRowPro}>
              <span className={styles.detailLabelPro}>Event</span>
              <span className={styles.detailValuePro}>{detailRecord.event.title}</span>
            </div>
            <div className={styles.detailRowPro}>
              <span className={styles.detailLabelPro}>Event Course</span>
              <span className={styles.detailValuePro}>
                {detailRecord.event.course ? (
                  <Badge variant="brand">{detailRecord.event.course.code}</Badge>
                ) : (
                  <span className={styles.muted}>—</span>
                )}
              </span>
            </div>
            <div className={styles.detailRowPro}>
              <span className={styles.detailLabelPro}>Date</span>
              <span className={styles.detailValuePro}>{formatDate(detailRecord.event.eventDate)}</span>
            </div>
            <div className={styles.detailRowPro}>
              <span className={styles.detailLabelPro}>Venue</span>
              <span className={styles.detailValuePro}>{detailRecord.event.venue}</span>
            </div>
            <div className={styles.detailRowPro}>
              <span className={styles.detailLabelPro}>Mandatory</span>
              <span className={styles.detailValuePro}>
                <Badge variant={detailRecord.event.isMandatory ? 'warning' : 'neutral'}>
                  {detailRecord.event.isMandatory ? 'Yes' : 'No'}
                </Badge>
              </span>
            </div>
            <div className={styles.detailRowPro}>
              <span className={styles.detailLabelPro}>Status</span>
              <span className={styles.detailValuePro}>
                <Select
                  value={detailEditStatus}
                  onChange={(e) => setDetailEditStatus(e.target.value as AttendanceStatus)}
                  options={statusSelectOptions}
                  className={styles.statusSelect}
                />
              </span>
            </div>
            {detailRecord.scannedAt && (
              <div className={styles.detailRowPro}>
                <span className={styles.detailLabelPro}>Scanned At</span>
                <span className={styles.detailValuePro}>{formatDate(detailRecord.scannedAt)}</span>
              </div>
            )}
            {detailRecord.notes && (
              <div className={styles.detailRowPro}>
                <span className={styles.detailLabelPro}>Notes</span>
                <span className={styles.detailValuePro}>{detailRecord.notes}</span>
              </div>
            )}
            <div className={styles.detailRowPro}>
              <span className={styles.detailLabelPro}>Dispute</span>
              <span className={styles.detailValuePro}>
                {detailRecord.dispute ? (
                  <Badge variant={DISPUTE_BADGE[detailRecord.dispute.status] ?? 'neutral'}>
                    {detailRecord.dispute.status}
                  </Badge>
                ) : (
                  <span className={styles.muted}>None</span>
                )}
              </span>
            </div>
            {detailRecord.dispute && (
              <>
                <div className={styles.detailRowPro}>
                  <span className={styles.detailLabelPro}>Dispute Reason</span>
                  <span className={styles.detailValuePro}>{detailRecord.dispute.reason || 'None provided'}</span>
                </div>
                <div className={styles.detailRowPro}>
                  <span className={styles.detailLabelPro}>Dispute ID</span>
                  <span className={styles.detailValuePro}>{detailRecord.dispute.id}</span>
                </div>
              </>
            )}
            
            {detailRecord.dispute && detailRecord.dispute.status === 'pending' && (
              <div style={{ marginTop: 20, padding: 16, border: '1px solid var(--color-border)', borderRadius: 8, background: 'var(--color-neutral-50)' }}>
                <h4 style={{ marginTop: 0, marginBottom: 12, fontSize: 14, color: 'var(--color-neutral-900)' }}>Resolve Dispute</h4>
                <div style={{ marginBottom: 16 }}>
                  <label className={styles.label}>Faculty Notes (optional)</label>
                  <Input 
                    value={disputeNotes} 
                    onChange={(e) => setDisputeNotes(e.target.value)} 
                    placeholder="Reason for approval/rejection" 
                  />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button 
                    size="sm" 
                    onClick={() => handleResolveDispute('approved')}
                    disabled={disputeResolving}
                  >
                    {disputeResolving && <span className={styles.spinner} />}
                    Approve
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => handleResolveDispute('rejected')}
                    disabled={disputeResolving}
                  >
                    {disputeResolving && <span className={styles.spinner} />}
                    Reject
                  </Button>
                </div>
              </div>
            )}
            <div style={{ marginTop: 12 }}>
              <label className={styles.label}>Reason for change (optional)</label>
              <Input
                value={detailEditReason}
                onChange={(e) => setDetailEditReason(e.target.value)}
                placeholder="e.g. Student was present but marked absent"
              />
            </div>
          </div>
        )}
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Attendance Record"
        footer={
          <div className={styles.dialogFooter}>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting && <span className={styles.spinner} />}
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        }
      >
        <div>
          <p>
            Are you sure you want to delete the attendance record for <strong>{deleteTarget?.student.firstName} {deleteTarget?.student.lastName}</strong>?
          </p>
          {deleteTarget?.dispute && (
            <p style={{ color: 'var(--color-danger)', fontWeight: 500, marginTop: 8 }}>
              This record has an active dispute. Deletion is blocked.
            </p>
          )}
          {!deleteTarget?.dispute && (
            <p style={{ marginTop: 8 }}>This action cannot be undone.</p>
          )}
        </div>
      </Dialog>

      {/* Add Record Dialog */}
      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Attendance Record"
        bodyClassName={styles.addDialogBody}
        footer={
          <div className={styles.dialogFooter}>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              onClick={handleAddRecord}
              disabled={addSubmitting || !addStudentId || !addEventId}
            >
              {addSubmitting && <span className={styles.spinner} />}
              {addSubmitting ? 'Creating...' : 'Create'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleAddRecord} className={styles.addForm}>
          {addError && <div style={{ color: 'var(--color-danger)', fontSize: 13, padding: '8px 12px', background: 'var(--color-danger-bg)', borderRadius: 6 }}>{addError}</div>}
          <div className={styles.field}>
            <label className={styles.label}>Student</label>
            <Select value={addStudentId} onChange={(e) => setAddStudentId(e.target.value)} options={[{ value: '', label: 'Select a student' }, ...studentOptions]} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Event</label>
            <Select value={addEventId} onChange={(e) => setAddEventId(e.target.value)} options={[{ value: '', label: 'Select an event' }, ...addEventOptions]} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Status</label>
            <Select value={addStatus} onChange={(e) => setAddStatus(e.target.value as AttendanceStatus)} options={statusSelectOptions} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Reason (optional)</label>
            <Input value={addReason} onChange={(e) => setAddReason(e.target.value)} placeholder="Reason for manual addition" />
          </div>
        </form>
      </Dialog>
    </div>
  )
}
