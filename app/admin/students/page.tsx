'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient, ApiError } from '@/lib/apiClient'
import { Badge } from '@/components/ui/Badge/Badge'
import { SearchBar } from '@/components/ui/SearchBar/SearchBar'
import { Select, type SelectOption } from '@/components/ui/Select/Select'
import { DataTable, type Column } from '@/components/ui/DataTable/DataTable'
import { Dialog } from '@/components/ui/Dialog/Dialog'
import { Button } from '@/components/ui/Button/Button'
import { LoadingOverlay } from '@/components/ui/LoadingOverlay/LoadingOverlay'
import { useToast } from '@/components/ui/Toast/Toast'
import styles from './page.module.css'

const PAGE_SIZE = 20

interface StudentRow {
  id: string
  firstName: string
  lastName: string
  studentId: string
  yearLevel: number
  createdAt: string
  user: { email: string; isSuspended: boolean }
  course: { id: string; code: string; name: string } | null
  _count: { attendanceRecords: number; sanctions: number; balances: number; disputes: number }
}

interface StudentListResponse {
  data: StudentRow[]
  total: number
  page: number
  limit: number
}

interface CourseOption {
  id: string
  code: string
  name: string
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString()
}

export default function AdminStudentsPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [data, setData] = useState<StudentRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCourse, setFilterCourse] = useState('')
  const [courseOptions, setCourseOptions] = useState<SelectOption[]>([])
  const [suspending, setSuspending] = useState(false)

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [detailRecord, setDetailRecord] = useState<StudentRow | null>(null)

  useEffect(() => {
    apiClient<{ data: CourseOption[] }>('/courses', { authenticated: true })
      .then((res) => {
        setCourseOptions((res.data || []).map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` })))
      })
      .catch(() => {})
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set('search', searchQuery)
      if (filterCourse) params.set('courseId', filterCourse)
      params.set('page', String(page))
      params.set('limit', String(PAGE_SIZE))
      const result = await apiClient<StudentListResponse>(`/students?${params.toString()}`, { authenticated: true })
      setData(result.data)
      setTotal(result.total)
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 401) {
        router.replace('/admin-login')
      }
    } finally {
      setLoading(false)
    }
  }, [searchQuery, filterCourse, page, router])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => setPage(1), 250)
  }, [])

  const handleSuspendToggle = useCallback(async (row: StudentRow) => {
    const shouldSuspend = !row.user.isSuspended
    setSuspending(true)
    try {
      const res = await apiClient<{ id: string; isSuspended: boolean }>(
        `/students/${row.id}/suspend`,
        { method: 'PATCH', body: { suspended: shouldSuspend }, authenticated: true }
      )
      toast({
        message: shouldSuspend
          ? `${row.firstName} ${row.lastName} has been suspended`
          : `${row.firstName} ${row.lastName} has been reactivated`,
        variant: shouldSuspend ? 'warning' : 'success',
      })
      await fetchData()
      setDetailRecord((prev) => (prev ? { ...prev, user: { ...prev.user, isSuspended: res.isSuspended } } : prev))
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 401) {
        router.replace('/admin-login')
      } else {
        toast({ message: 'Failed to update account status', variant: 'error' })
      }
    } finally {
      setSuspending(false)
    }
  }, [fetchData, router, toast])

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const columns: Column<StudentRow>[] = useMemo(() => [
    {
      key: 'studentId',
      header: 'ID',
      width: '100px',
      render: (row) => <span className={styles.idCell}>{row.studentId}</span>,
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (row) => <span className={styles.nameCell}>{row.lastName}, {row.firstName}</span>,
    },
    {
      key: 'course',
      header: 'Course',
      render: (row) =>
        row.course ? <Badge variant="brand">{row.course.code}</Badge> : <span className={styles.muted}>—</span>,
    },
    {
      key: 'yearLevel',
      header: 'Year',
      render: (row) => <span>Year {row.yearLevel}</span>,
    },
    {
      key: 'user',
      header: 'Email',
      render: (row) => <span className={styles.muted}>{row.user.email}</span>,
    },
    {
      key: 'suspended',
      header: 'Status',
      render: (row) =>
        row.user.isSuspended
          ? <Badge variant="danger">Suspended</Badge>
          : <Badge variant="success">Active</Badge>,
    },
    {
      key: '_count',
      header: 'Attendance',
      render: (row) => <span>{row._count.attendanceRecords}</span>,
    },
    {
      key: 'createdAt',
      header: 'Enrolled',
      render: (row) => <span className={styles.muted}>{formatDate(row.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      width: '80px',
      render: (row) => (
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setDetailRecord(row) }}>View</Button>
      ),
    },
  ], [])

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Students</h1>
      </div>

      <div className={styles.toolbar}>
        <SearchBar value={searchQuery} onChange={handleSearch} placeholder="Search by name or ID..." className={styles.search} />
        <Select
          value={filterCourse}
          onChange={(e) => { setFilterCourse(e.target.value); setPage(1) }}
          options={[{ value: '', label: 'All Courses' }, ...courseOptions]}
          placeholder="All Courses"
          className={styles.filterSelect}
        />
      </div>

      <DataTable
        columns={columns}
        data={data}
        getRowId={(r) => r.id}
        loading={loading}
        onRowClick={(r) => setDetailRecord(r)}
        emptyState={<span>No students found.</span>}
        pagination={{ page, pageCount, onPageChange: setPage }}
      />

      {/* Detail Drawer */}
      <Dialog
        open={!!detailRecord}
        onClose={() => setDetailRecord(null)}
        title={detailRecord ? `${detailRecord.lastName}, ${detailRecord.firstName}` : ''}
        position="right"
        bodyClassName={styles.detailBody}
        footer={
          <div className={styles.dialogFooter}>
            <Button variant="ghost" onClick={() => setDetailRecord(null)}>Close</Button>
            <Button
              variant={detailRecord?.user.isSuspended ? 'primary' : 'destructive'}
              onClick={() => detailRecord && handleSuspendToggle(detailRecord)}
              disabled={suspending}
            >
              {detailRecord?.user.isSuspended
                ? 'Reactivate Account'
                : 'Suspend Account'}
            </Button>
          </div>
        }
      >
        <div style={{ position: 'relative' }}>
          <LoadingOverlay visible={suspending} message={detailRecord?.user.isSuspended ? 'Reactivating account...' : 'Suspending account...'}>
            {detailRecord && (
              <div className={styles.detailContent}>
                <div className={styles.drawerCard}>
                  <div className={styles.drawerCardGrid}>
                    <div className={styles.drawerField}>
                      <span className={styles.drawerFieldLabel}>Student ID</span>
                      <span className={styles.drawerFieldValue}>{detailRecord.studentId}</span>
                    </div>
                    <div className={styles.drawerField}>
                      <span className={styles.drawerFieldLabel}>Name</span>
                      <span className={styles.drawerFieldValue}>{detailRecord.firstName} {detailRecord.lastName}</span>
                    </div>
                    <div className={styles.drawerField}>
                      <span className={styles.drawerFieldLabel}>Email</span>
                      <span className={styles.drawerFieldValue}>{detailRecord.user.email}</span>
                    </div>
                    <div className={styles.drawerField}>
                      <span className={styles.drawerFieldLabel}>Status</span>
                      <span className={styles.drawerFieldValue}>
                        {detailRecord.user.isSuspended ? <Badge variant="danger">Suspended</Badge> : <Badge variant="success">Active</Badge>}
                      </span>
                    </div>
                    <div className={styles.drawerField}>
                      <span className={styles.drawerFieldLabel}>Course</span>
                      <span className={styles.drawerFieldValue}>
                        {detailRecord.course ? <Badge variant="brand">{detailRecord.course.name}</Badge> : '—'}
                      </span>
                    </div>
                    <div className={styles.drawerField}>
                      <span className={styles.drawerFieldLabel}>Year Level</span>
                      <span className={styles.drawerFieldValue}>Year {detailRecord.yearLevel}</span>
                    </div>
                    <div className={styles.drawerField}>
                      <span className={styles.drawerFieldLabel}>Enrolled</span>
                      <span className={styles.drawerFieldValue}>{formatDate(detailRecord.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.drawerSection}>
                  <h3 className={styles.drawerSectionTitle}>Records</h3>
                  <div className={styles.drawerCard}>
                    <div className={styles.drawerCardGrid}>
                      <div className={styles.drawerField}>
                        <span className={styles.drawerFieldLabel}>Attendance Records</span>
                        <span className={styles.drawerFieldValue}>{detailRecord._count.attendanceRecords}</span>
                      </div>
                      <div className={styles.drawerField}>
                        <span className={styles.drawerFieldLabel}>Sanctions</span>
                        <span className={styles.drawerFieldValue}>{detailRecord._count.sanctions}</span>
                      </div>
                      <div className={styles.drawerField}>
                        <span className={styles.drawerFieldLabel}>Balances</span>
                        <span className={styles.drawerFieldValue}>{detailRecord._count.balances}</span>
                      </div>
                      <div className={styles.drawerField}>
                        <span className={styles.drawerFieldLabel}>Disputes</span>
                        <span className={styles.drawerFieldValue}>{detailRecord._count.disputes}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </LoadingOverlay>
        </div>
      </Dialog>
    </div>
  )
}
