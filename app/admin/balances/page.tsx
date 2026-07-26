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
import { DatePicker } from '@/components/ui/DatePicker/DatePicker'
import { Tabs, type Tab } from '@/components/ui/Tabs/Tabs'
import { StatCard } from '@/components/ui/StatCard/StatCard'
import { useToast } from '@/components/ui/Toast/Toast'
import styles from './page.module.css'

const PAGE_SIZE = 10

interface StudentInfo {
  id: string
  firstName: string
  lastName: string
  studentId: string
  course: { id: string; code: string; name: string } | null
}

interface PaymentInfo {
  id: string
  amount: number
  referenceNo: string | null
  paidAt: string
  notes: string | null
  paymentMethod: { name: string }
}

interface BalanceRecord {
  id: string
  studentId: string
  description: string
  amount: number
  status: 'unpaid' | 'partial' | 'paid'
  dueDate: string | null
  createdAt: string
  updatedAt: string
  student: StudentInfo
  payments: PaymentInfo[]
}

interface BalanceSummary {
  totalOutstanding: number
  unpaid: number
  partial: number
  paid: number
  overdue: number
}

interface BalanceListResponse {
  data: BalanceRecord[]
  total: number
  page: number
  limit: number
  summary: BalanceSummary
}

interface CourseOption {
  id: string
  code: string
  name: string
}

interface StudentOption {
  id: string
  firstName: string
  lastName: string
  studentId: string
  course: { id: string; code: string } | null
}

interface PaymentMethodOption {
  id: string
  name: string
  accountName: string | null
  accountNumber: string | null
  instructions: string | null
  isActive: boolean
}

type BalanceStatus = 'unpaid' | 'partial' | 'paid'

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'danger'> = {
  paid: 'success',
  partial: 'warning',
  unpaid: 'danger',
}

const DETAIL_TABS: Tab[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'payments', label: 'Payments' },
]

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatCurrency(amount: number): string {
  return `₱${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function AdminBalancesPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [records, setRecords] = useState<BalanceRecord[]>([])
  const [summary, setSummary] = useState<BalanceSummary | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCourseId, setFilterCourseId] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const [courses, setCourses] = useState<CourseOption[]>([])
  const [students, setStudents] = useState<StudentOption[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>([])

  const [addOpen, setAddOpen] = useState(false)
  const [addMode, setAddMode] = useState<'single' | 'course' | 'all'>('single')
  const [addStudentId, setAddStudentId] = useState('')
  const [addCourseId, setAddCourseId] = useState('')
  const [addDescription, setAddDescription] = useState('')
  const [addAmount, setAddAmount] = useState('')
  const [addDueDate, setAddDueDate] = useState('')
  const [addSubmitting, setAddSubmitting] = useState(false)
  const [addError, setAddError] = useState('')

  const [detailRecord, setDetailRecord] = useState<BalanceRecord | null>(null)
  const [detailTab, setDetailTab] = useState('overview')
  const [detailEditing, setDetailEditing] = useState(false)
  const [detailEditAmount, setDetailEditAmount] = useState('')
  const [detailEditDescription, setDetailEditDescription] = useState('')
  const [detailEditDueDate, setDetailEditDueDate] = useState('')
  const [detailEditStatus, setDetailEditStatus] = useState<string>('')
  const [detailSaving, setDetailSaving] = useState(false)

  const [payOpen, setPayOpen] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payMethodId, setPayMethodId] = useState('')
  const [payRefNo, setPayRefNo] = useState('')
  const [payNotes, setPayNotes] = useState('')
  const [paySubmitting, setPaySubmitting] = useState(false)
  const [payError, setPayError] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<BalanceRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [methodsOpen, setMethodsOpen] = useState(false)
  const [editingMethodId, setEditingMethodId] = useState<string | null>(null)
  const [newMethodName, setNewMethodName] = useState('')
  const [newMethodAccountName, setNewMethodAccountName] = useState('')
  const [newMethodAccountNumber, setNewMethodAccountNumber] = useState('')
  const [newMethodInstructions, setNewMethodInstructions] = useState('')
  const [methodSubmitting, setMethodSubmitting] = useState(false)
  const [deleteMethodTarget, setDeleteMethodTarget] = useState<PaymentMethodOption | null>(null)
  const [methodDeleting, setMethodDeleting] = useState(false)

  const statusOptions: SelectOption[] = [
    { value: '', label: 'All Statuses' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'unpaid', label: 'Unpaid' },
    { value: 'partial', label: 'Partial' },
    { value: 'paid', label: 'Paid' },
  ]

  const courseOptions = useMemo<SelectOption[]>(
    () => [{ value: '', label: 'All Courses' }, ...courses.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))],
    [courses],
  )

  const courseSelectorOptions = useMemo<SelectOption[]>(
    () => courses.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` })),
    [courses],
  )

  const payMethodOptions = useMemo<SelectOption[]>(
    () => paymentMethods.filter((m) => m.isActive).map((m) => ({
      value: m.id,
      label: m.accountNumber ? `${m.name} — ${m.accountNumber}` : m.name,
    })),
    [paymentMethods],
  )

  const studentOptions = useMemo<SelectOption[]>(
    () => students.map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName} (${s.studentId})` })),
    [students],
  )

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(currentPage))
      params.set('limit', String(PAGE_SIZE))
      if (searchQuery) params.set('search', searchQuery)
      if (filterStatus) params.set('status', filterStatus)
      if (filterCourseId) params.set('courseId', filterCourseId)

      const result = await apiClient<BalanceListResponse>(`/balances?${params.toString()}`, { authenticated: true })
      setRecords(result.data)
      setTotal(result.total)
      setSummary(result.summary)
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : 'Failed to load balances', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }, [router, currentPage, searchQuery, filterStatus, filterCourseId, toast])

  const fetchCourses = useCallback(async () => {
    try {
      const result = await apiClient<{ data: CourseOption[] }>('/courses', { authenticated: true })
      setCourses(result.data)
    } catch { /* ignore */ }
  }, [])

  const fetchStudents = useCallback(async () => {
    try {
      const result = await apiClient<{ data: StudentOption[] }>('/students', { authenticated: true })
      setStudents(result.data)
    } catch { /* ignore */ }
  }, [])

  const fetchPaymentMethods = useCallback(async () => {
    try {
      const result = await apiClient<{ data: PaymentMethodOption[] }>('/payments/methods', { authenticated: true })
      setPaymentMethods(result.data)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    fetchRecords()
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current) }
  }, [fetchRecords])

  useEffect(() => {
    fetchCourses()
    fetchStudents()
    fetchPaymentMethods()
  }, [fetchCourses, fetchStudents, fetchPaymentMethods])

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSearchChange = useCallback((value: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      setSearchQuery(value)
      setCurrentPage(1)
    }, 250)
  }, [])

  const openAdd = useCallback(() => {
    setAddMode('single')
    setAddStudentId('')
    setAddCourseId('')
    setAddDescription('')
    setAddAmount('')
    setAddDueDate('')
    setAddError('')
    setAddOpen(true)
  }, [])

  const handleAddSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setAddSubmitting(true)
    setAddError('')
    try {
      if (addMode === 'single') {
        await apiClient('/balances', {
          method: 'POST',
          body: { studentId: addStudentId, description: addDescription, amount: parseFloat(addAmount), dueDate: addDueDate || undefined },
          authenticated: true,
        })
        toast({ message: 'Balance created', variant: 'success' })
      } else {
        const body: Record<string, unknown> = { description: addDescription, amount: parseFloat(addAmount) }
        if (addDueDate) body.dueDate = addDueDate
        if (addMode === 'course' && addCourseId) body.courseId = addCourseId

        const result = await apiClient<{ created: number; skipped: number }>('/balances/bulk', {
          method: 'POST',
          body,
          authenticated: true,
        })
        if (result.skipped > 0) {
          toast({ message: `${result.created} created, ${result.skipped} skipped (already exist)`, variant: 'success' })
        } else {
          toast({ message: `${result.created} balances created`, variant: 'success' })
        }
      }
      setAddOpen(false)
      fetchRecords()
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to create balance')
    } finally {
      setAddSubmitting(false)
    }
  }, [addMode, addStudentId, addCourseId, addDescription, addAmount, addDueDate, toast, fetchRecords])

  const openDetail = useCallback((record: BalanceRecord) => {
    setDetailRecord(record)
    setDetailTab('overview')
    setDetailEditing(false)
  }, [])

  const startEditing = useCallback(() => {
    if (!detailRecord) return
    setDetailEditAmount(String(detailRecord.amount))
    setDetailEditDescription(detailRecord.description)
    setDetailEditDueDate(detailRecord.dueDate ? detailRecord.dueDate.split('T')[0] : '')
    setDetailEditStatus(detailRecord.status)
    setDetailEditing(true)
  }, [detailRecord])

  const cancelEditing = useCallback(() => {
    setDetailEditing(false)
  }, [])

  const handleEditSave = useCallback(async () => {
    if (!detailRecord) return
    setDetailSaving(true)
    try {
      const body: Record<string, unknown> = {}
      if (detailEditAmount !== String(detailRecord.amount)) body.amount = parseFloat(detailEditAmount)
      if (detailEditDescription !== detailRecord.description) body.description = detailEditDescription
      const newDue = detailEditDueDate || null
      const oldDue = detailRecord.dueDate ? detailRecord.dueDate.split('T')[0] : null
      if (newDue !== oldDue) body.dueDate = newDue
      if (detailEditStatus !== detailRecord.status) body.status = detailEditStatus

      if (Object.keys(body).length === 0) {
        setDetailEditing(false)
        return
      }

      const updated = await apiClient<BalanceRecord>(`/balances/${detailRecord.id}`, {
        method: 'PATCH',
        body,
        authenticated: true,
      })
      toast({ message: 'Balance updated', variant: 'success' })
      setDetailRecord(updated)
      setDetailEditing(false)
      fetchRecords()
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : 'Failed to update balance', variant: 'error' })
    } finally {
      setDetailSaving(false)
    }
  }, [detailRecord, detailEditAmount, detailEditDescription, detailEditDueDate, detailEditStatus, toast, fetchRecords])

  const openPay = useCallback(() => {
    if (!detailRecord) return
    setPayAmount('')
    setPayMethodId(payMethodOptions.length > 0 ? payMethodOptions[0].value : '')
    setPayRefNo('')
    setPayNotes('')
    setPayError('')
    setPayOpen(true)
  }, [detailRecord, payMethodOptions])

  const handlePaySubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!detailRecord) return
    setPaySubmitting(true)
    setPayError('')
    try {
      const payment = await apiClient('/payments', {
        method: 'POST',
        body: { balanceId: detailRecord.id, paymentMethodId: payMethodId, amount: parseFloat(payAmount), referenceNo: payRefNo || undefined, notes: payNotes || undefined },
        authenticated: true,
      })
      toast({ message: 'Payment recorded', variant: 'success' })
      setPayOpen(false)
      // Refresh detail record and list
      const updated = await apiClient<BalanceRecord>(`/balances/${detailRecord.id}`, { authenticated: true })
      setDetailRecord(updated)
      fetchRecords()
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Failed to record payment')
    } finally {
      setPaySubmitting(false)
    }
  }, [detailRecord, payMethodId, payAmount, payRefNo, payNotes, toast, fetchRecords])

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await apiClient(`/balances/${deleteTarget.id}`, { method: 'DELETE', authenticated: true })
      toast({ message: 'Balance deleted', variant: 'success' })
      setDeleteTarget(null)
      setDetailRecord(null)
      fetchRecords()
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : 'Failed to delete balance', variant: 'error' })
    } finally {
      setDeleting(false)
    }
  }, [deleteTarget, toast, fetchRecords])

  const resetMethodForm = useCallback(() => {
    setEditingMethodId(null)
    setNewMethodName('')
    setNewMethodAccountName('')
    setNewMethodAccountNumber('')
    setNewMethodInstructions('')
  }, [])

  const startEditMethod = useCallback((m: PaymentMethodOption) => {
    setEditingMethodId(m.id)
    setNewMethodName(m.name)
    setNewMethodAccountName(m.accountName || '')
    setNewMethodAccountNumber(m.accountNumber || '')
    setNewMethodInstructions(m.instructions || '')
  }, [])

  const handleAddMethod = useCallback(async () => {
    if (!newMethodName.trim()) return
    setMethodSubmitting(true)
    try {
      if (editingMethodId) {
        await apiClient(`/payments/methods/${editingMethodId}`, {
          method: 'PATCH',
          body: {
            name: newMethodName.trim(),
            accountName: newMethodAccountName.trim() || null,
            accountNumber: newMethodAccountNumber.trim() || null,
            instructions: newMethodInstructions.trim() || null,
          },
          authenticated: true,
        })
        toast({ message: 'Payment method updated', variant: 'success' })
      } else {
        await apiClient('/payments/methods', {
          method: 'POST',
          body: {
            name: newMethodName.trim(),
            accountName: newMethodAccountName.trim() || undefined,
            accountNumber: newMethodAccountNumber.trim() || undefined,
            instructions: newMethodInstructions.trim() || undefined,
          },
          authenticated: true,
        })
        toast({ message: 'Payment method added', variant: 'success' })
      }
      resetMethodForm()
      fetchPaymentMethods()
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : 'Failed to save method', variant: 'error' })
    } finally {
      setMethodSubmitting(false)
    }
  }, [editingMethodId, newMethodName, newMethodAccountName, newMethodAccountNumber, newMethodInstructions, toast, fetchPaymentMethods, resetMethodForm])

  const confirmDeleteMethod = useCallback(async () => {
    if (!deleteMethodTarget) return
    setMethodDeleting(true)
    try {
      await apiClient(`/payments/methods/${deleteMethodTarget.id}`, { method: 'DELETE', authenticated: true })
      toast({ message: 'Payment method removed', variant: 'success' })
      setDeleteMethodTarget(null)
      fetchPaymentMethods()
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : 'Failed to delete method', variant: 'error' })
    } finally {
      setMethodDeleting(false)
    }
  }, [deleteMethodTarget, toast, fetchPaymentMethods])

  const totalPaid = useMemo(() => {
    if (!detailRecord) return 0
    return detailRecord.payments.reduce((sum, p) => sum + Number(p.amount), 0)
  }, [detailRecord])

  const overdueDetail = useMemo(() => {
    if (!detailRecord) return false
    if (detailRecord.status === 'paid') return false
    if (!detailRecord.dueDate) return false
    return new Date(detailRecord.dueDate) < new Date()
  }, [detailRecord])

  const columnDefs: Column<BalanceRecord>[] = useMemo(() => [
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
      key: 'description',
      header: 'Description',
      sortable: true,
      render: (row) => row.description,
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      render: (row) => formatCurrency(Number(row.amount)),
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      sortable: true,
      render: (row) => formatDate(row.dueDate),
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
      key: 'outstanding',
      header: 'Outstanding',
      render: (row) => {
        const paid = row.payments.reduce((s, p) => s + Number(p.amount), 0)
        const outstanding = Number(row.amount) - paid
        return outstanding > 0 ? <span style={{ color: 'var(--color-status-danger)', fontWeight: 600 }}>{formatCurrency(outstanding)}</span> : <span style={{ color: 'var(--color-status-success)' }}>Paid</span>
      },
    },
    {
      key: 'actions',
      header: '',
      width: '100px',
      render: (row) => (
        <div className={styles.actionBtns}>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openDetail(row) }}>View</Button>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setDeleteTarget(row) }}>Delete</Button>
        </div>
      ),
    },
  ], [openDetail])

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Balances</h1>
        <div className={styles.headerRight}>
          <Button variant="outline" onClick={() => { fetchPaymentMethods(); resetMethodForm(); setMethodsOpen(true) }}>Payment Methods</Button>
          <Button onClick={openAdd}>Add Balance</Button>
        </div>
      </div>

      <div className={styles.filterBar}>
        <SearchBar defaultValue={searchQuery} onChange={handleSearchChange} placeholder="Search by name or ID..." className={styles.search} />
        <Select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1) }} options={statusOptions} className={styles.filterSelect} />
        <Select value={filterCourseId} onChange={(e) => { setFilterCourseId(e.target.value); setCurrentPage(1) }} options={courseOptions} className={styles.filterSelect} />
      </div>

      {summary && (
        <div className={styles.statsGrid}>
          <StatCard value={formatCurrency(summary.totalOutstanding)} label="Outstanding" loading={false} />
          <StatCard value={summary.unpaid} label="Unpaid" loading={false} />
          <StatCard value={summary.partial} label="Partial" loading={false} />
          <StatCard value={summary.overdue > 0 ? `${summary.overdue}` : '0'} label="Overdue" loading={false} />
        </div>
      )}

      <DataTable
        columns={columnDefs}
        data={records}
        getRowId={(r) => r.id}
        loading={loading}
        onRowClick={openDetail}
        emptyState={
          <div className={styles.emptyState}>
            <p>No balance records found.</p>
          </div>
        }
        pagination={
          total > 0
            ? { page: currentPage, pageCount, onPageChange: setCurrentPage }
            : undefined
        }
      />

      {/* Add Balance Dialog */}
      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Balance"
        bodyClassName={styles.addDialogBody}
        footer={
          <div className={styles.dialogFooter}>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddSubmit} disabled={addSubmitting || !addDescription || !addAmount || (addMode === 'single' && !addStudentId) || (addMode === 'course' && !addCourseId)}>
              {addSubmitting && <span className={styles.spinner} />}
              {addSubmitting ? 'Creating...' : addMode === 'single' ? 'Create' : 'Create for All'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleAddSubmit} className={styles.form}>
          {addError && <div className={styles.formError}>{addError}</div>}
          <div className={styles.field}>
            <label className={styles.label}>Type</label>
            <Select value={addMode} onChange={(e) => setAddMode(e.target.value as 'single' | 'course' | 'all')}
              options={[
                { value: 'single', label: 'Single Student' },
                { value: 'course', label: 'All Students in a Course' },
                { value: 'all', label: 'All Students' },
              ]} />
          </div>
          {addMode === 'single' && (
            <div className={styles.field}>
              <label className={styles.label}>Student</label>
              <Select value={addStudentId} onChange={(e) => setAddStudentId(e.target.value)} options={[{ value: '', label: 'Select a student' }, ...studentOptions]} />
            </div>
          )}
          {addMode === 'course' && (
            <div className={styles.field}>
              <label className={styles.label}>Course</label>
              <Select value={addCourseId} onChange={(e) => setAddCourseId(e.target.value)} options={[{ value: '', label: 'Select a course' }, ...courseSelectorOptions]} />
            </div>
          )}
          <div className={styles.field}>
            <label className={styles.label}>Description</label>
            <Input value={addDescription} onChange={(e) => setAddDescription(e.target.value)} placeholder="e.g. Membership Fee 2026" required />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Amount (₱)</label>
            <Input value={addAmount} onChange={(e) => setAddAmount(e.target.value)} type="number" step="0.01" min="0.01" placeholder="0.00" required />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Due Date</label>
            <DatePicker value={addDueDate} onChange={(v) => setAddDueDate(v)} placeholder="Select due date" />
          </div>
        </form>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog
        open={!!detailRecord}
        onClose={() => { setDetailRecord(null); setDetailEditing(false) }}
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
          detailTab === 'payments' ? (
            <div className={styles.dialogFooter}>
              <div />
              <div className={styles.dialogFooterRight}>
                <Button variant="outline" onClick={() => setDetailTab('overview')}>Back</Button>
                <Button onClick={openPay}>Record Payment</Button>
              </div>
            </div>
          ) : detailEditing ? (
            <div className={styles.dialogFooter}>
              <div>
                {detailRecord && (
                  <Button variant="destructive" onClick={() => { setDeleteTarget(detailRecord); setDetailRecord(null) }}>
                    Delete
                  </Button>
                )}
              </div>
              <div className={styles.dialogFooterRight}>
                <Button variant="outline" onClick={cancelEditing}>Cancel</Button>
                <Button onClick={handleEditSave} disabled={detailSaving}>
                  {detailSaving && <span className={styles.spinner} />}
                  {detailSaving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          ) : (
            <div className={styles.dialogFooter}>
              <div>
                {detailRecord && (
                  <Button variant="destructive" onClick={() => { setDeleteTarget(detailRecord); setDetailRecord(null) }}>
                    Delete
                  </Button>
                )}
              </div>
              <div className={styles.dialogFooterRight}>
                <Button variant="outline" onClick={startEditing}>Edit Details</Button>
                <Button variant="outline" onClick={() => setDetailRecord(null)}>Close</Button>
              </div>
            </div>
          )
        }
      >
        {detailRecord && (
          <>
            {detailTab === 'overview' && !detailEditing && (
              <div className={styles.drawerStats}>
                <div className={styles.drawerStatCard}>
                  <div className={styles.drawerStatLabel}>Amount Due</div>
                  <div className={styles.drawerStatValue}>{formatCurrency(Number(detailRecord.amount))}</div>
                </div>
                <div className={styles.drawerStatCard}>
                  <div className={styles.drawerStatLabel}>Outstanding</div>
                  <div className={`${styles.drawerStatValue} ${Number(detailRecord.amount) - totalPaid > 0 ? styles.danger : styles.success}`}>
                    {formatCurrency(Number(detailRecord.amount) - totalPaid)}
                  </div>
                </div>
              </div>
            )}
            
            <Tabs tabs={DETAIL_TABS} activeId={detailTab} onChange={setDetailTab} className={styles.detailTabs} />
            
            {detailTab === 'overview' && (
              <>
                {detailEditing ? (
                  <div className={styles.detailGridPro}>
                    <div className={styles.field}>
                      <label className={styles.label}>Description</label>
                      <Input value={detailEditDescription} onChange={(e) => setDetailEditDescription(e.target.value)} required />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Amount (₱)</label>
                      <Input value={detailEditAmount} onChange={(e) => setDetailEditAmount(e.target.value)} type="number" step="0.01" min="0.01" required />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Due Date</label>
                      <DatePicker value={detailEditDueDate} onChange={(v) => setDetailEditDueDate(v)} placeholder="No due date" />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Status</label>
                      <Select 
                        value={detailEditStatus}
                        onChange={(e) => setDetailEditStatus(e.target.value)}
                        options={[
                          { value: 'unpaid', label: 'Unpaid' },
                          { value: 'partial', label: 'Partial' },
                          { value: 'paid', label: 'Paid' },
                        ]}
                      />
                    </div>
                  </div>
                ) : (
                  <div className={styles.detailGridPro}>
                    <div className={styles.detailRowPro}>
                      <span className={styles.detailLabelPro}>Description</span>
                      <span className={styles.detailValuePro}>{detailRecord.description}</span>
                    </div>
                    <div className={styles.detailRowPro}>
                      <span className={styles.detailLabelPro}>Due Date</span>
                      <span className={styles.detailValuePro}>{formatDate(detailRecord.dueDate)}</span>
                    </div>
                    <div className={styles.detailRowPro}>
                      <span className={styles.detailLabelPro}>Status</span>
                      <span className={styles.detailValuePro}>
                        <Badge variant={STATUS_BADGE[detailRecord.status]}>{detailRecord.status}</Badge>
                        {overdueDetail && <span style={{ color: 'var(--color-status-danger)', fontSize: 12, fontWeight: 600 }}>OVERDUE</span>}
                      </span>
                    </div>
                    <div className={styles.detailRowPro}>
                      <span className={styles.detailLabelPro}>Total Paid</span>
                      <span className={styles.detailValuePro} style={{ color: 'var(--color-status-success)' }}>{formatCurrency(totalPaid)}</span>
                    </div>
                  </div>
                )}
                
              </>
            )}
            {detailTab === 'payments' && (
              <div className={styles.paymentsSection}>
                <div className={styles.paymentsTitle}>Payment History</div>
                {detailRecord.payments.length === 0 ? (
                  <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>No payments recorded yet.</p>
                ) : (
                  detailRecord.payments.map((p) => (
                    <div key={p.id} className={styles.paymentRow}>
                      <div>
                        <div className={styles.paymentAmount}>{formatCurrency(Number(p.amount))}</div>
                        <div className={styles.paymentMeta}>
                          {p.paymentMethod.name}{p.referenceNo ? ` · Ref: ${p.referenceNo}` : ''}
                        </div>
                      </div>
                      <div className={styles.paymentMeta}>
                        {formatDate(p.paidAt)}
                        {p.notes ? ` · ${p.notes}` : ''}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="Record Payment"
        footer={
          <div className={styles.dialogFooter}>
            <Button variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
            <Button onClick={handlePaySubmit} disabled={paySubmitting || !payAmount || !payMethodId}>
              {paySubmitting && <span className={styles.spinner} />}
              {paySubmitting ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handlePaySubmit} className={styles.payForm}>
          {payError && <div className={styles.formError}>{payError}</div>}
          <div className={styles.payRow}>
            <div className={styles.field}>
              <label className={styles.label}>Amount (₱)</label>
              <Input value={payAmount} onChange={(e) => setPayAmount(e.target.value)} type="number" step="0.01" min="0.01" placeholder="0.00" required />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Payment Method</label>
              {payMethodOptions.length > 0 ? (
                <Select value={payMethodId} onChange={(e) => setPayMethodId(e.target.value)} options={payMethodOptions} />
              ) : (
                <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>No active methods. Add one first.</span>
              )}
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Reference No. (optional)</label>
            <Input value={payRefNo} onChange={(e) => setPayRefNo(e.target.value)} placeholder="GCash ref #" />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Notes (optional)</label>
            <Input value={payNotes} onChange={(e) => setPayNotes(e.target.value)} placeholder="Any notes" />
          </div>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Balance"
        footer={
          <div className={styles.dialogFooter}>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting || (deleteTarget ? deleteTarget.payments.length > 0 : false)}>
              {deleting && <span className={styles.spinner} />}
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        }
      >
        <div className={styles.deleteText}>
          {deleteTarget && deleteTarget.payments.length > 0 ? (
            <>
              <p>This balance has <strong>{deleteTarget.payments.length} payment(s)</strong> recorded against it.</p>
              <p style={{ color: 'var(--color-status-danger)', fontWeight: 500 }}>Cannot delete. Reverse the payments first.</p>
            </>
          ) : (
            <>
              <p>Are you sure you want to delete the balance for <strong>{deleteTarget?.student.firstName} {deleteTarget?.student.lastName}</strong>?</p>
              <p>{deleteTarget?.description} — {deleteTarget ? formatCurrency(Number(deleteTarget.amount)) : ''}</p>
              <p>This action cannot be undone.</p>
            </>
          )}
        </div>
      </Dialog>

      {/* Payment Methods Dialog */}
      <Dialog
        open={methodsOpen}
        onClose={() => setMethodsOpen(false)}
        title="Payment Methods"
        bodyClassName={styles.manageMethodsBody}
        footer={
          <div className={styles.dialogFooter}>
            <Button variant="outline" onClick={() => { resetMethodForm(); setMethodsOpen(false) }}>Close</Button>
          </div>
        }
      >
        <div className={styles.form}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-neutral-900)', marginBottom: 4 }}>
            {editingMethodId ? 'Edit Method' : 'Add New Method'}
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Method Name</label>
            <Input value={newMethodName} onChange={(e) => setNewMethodName(e.target.value)} placeholder="e.g. GCash, Bank Transfer" />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Account Name (optional)</label>
            <Input value={newMethodAccountName} onChange={(e) => setNewMethodAccountName(e.target.value)} placeholder="e.g. OLI Faculty Account" />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Account Number (optional)</label>
            <Input value={newMethodAccountNumber} onChange={(e) => setNewMethodAccountNumber(e.target.value)} placeholder="e.g. 0917XXX1234" />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Instructions (optional)</label>
            <Input value={newMethodInstructions} onChange={(e) => setNewMethodInstructions(e.target.value)} placeholder="e.g. Send screenshot to the treasurer" />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={handleAddMethod} disabled={methodSubmitting || !newMethodName.trim()}>
              {methodSubmitting && <span className={styles.spinner} />}
              {methodSubmitting ? 'Saving...' : editingMethodId ? 'Save' : 'Add Method'}
            </Button>
            {editingMethodId && (
              <Button variant="outline" onClick={resetMethodForm}>Cancel</Button>
            )}
          </div>
          <div style={{ marginTop: 16, borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
            {paymentMethods.map((m) => (
              <div key={m.id} className={styles.methodRow}>
                <div style={{ flex: 1 }}>
                  <span className={styles.methodName}>{m.name}</span>
                  {!m.isActive && <span className={styles.inactiveLabel}>(inactive)</span>}
                  <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {m.accountName && <div>Account: {m.accountName}</div>}
                    {m.accountNumber && <div>Number: {m.accountNumber}</div>}
                    {m.instructions && <div style={{ marginTop: 2 }}>{m.instructions}</div>}
                  </div>
                </div>
                <div className={styles.actionBtns}>
                  <Button variant="ghost" size="sm" onClick={() => startEditMethod(m)}>Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteMethodTarget(m)}>Delete</Button>
                </div>
              </div>
            ))}
            {paymentMethods.length === 0 && (
              <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>No payment methods yet.</p>
            )}
          </div>
        </div>
      </Dialog>

      {/* Delete Payment Method Confirmation */}
      <Dialog
        open={!!deleteMethodTarget}
        onClose={() => setDeleteMethodTarget(null)}
        title="Delete Payment Method"
        footer={
          <div className={styles.dialogFooter}>
            <Button variant="outline" onClick={() => setDeleteMethodTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeleteMethod} disabled={methodDeleting}>
              {methodDeleting && <span className={styles.spinner} />}
              {methodDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        }
      >
        <div className={styles.deleteText}>
          <p>Are you sure you want to delete <strong>{deleteMethodTarget?.name}</strong>?</p>
          <p>If this method has existing payments, it will be deactivated instead.</p>
        </div>
      </Dialog>
    </div>
  )
}
