'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient, ApiError } from '@/lib/apiClient'
import { Button } from '@/components/ui/Button/Button'
import { Badge } from '@/components/ui/Badge/Badge'
import { SearchBar } from '@/components/ui/SearchBar/SearchBar'
import { DataTable, type Column } from '@/components/ui/DataTable/DataTable'
import { Dialog } from '@/components/ui/Dialog/Dialog'
import { Input } from '@/components/ui/Input/Input'
import { Tabs, type Tab } from '@/components/ui/Tabs/Tabs'
import { useToast } from '@/components/ui/Toast/Toast'
import styles from './page.module.css'

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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString()
}

const PAGE_SIZE = 10

interface Course {
  id: string
  code: string
  name: string
  createdAt: string
  updatedAt: string
  _count?: { events: number; students: number }
}

interface CourseAttendance {
  id: string
  code: string
  name: string
  totalEvents: number
  totalRecords: number
  present: number
  late: number
  absent: number
  attendanceRate: number | null
}

interface EventItem {
  id: string
  title: string
  eventDate: string
  startTime: string
  venue: string
  isMandatory: boolean
  course: { code: string; name: string } | null
}

interface CourseRow {
  id: string
  code: string
  name: string
  events: number
  students: number
  attendanceRate: number | null
}

const RATE_BADGE = (rate: number | null): 'success' | 'warning' | 'danger' => {
  if (rate === null) return 'danger'
  if (rate >= 75) return 'success'
  if (rate >= 50) return 'warning'
  return 'danger'
}

const DETAIL_TABS: Tab[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'events', label: 'Events' },
]

export default function AdminCoursesPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [courses, setCourses] = useState<Course[]>([])
  const [attendanceMap, setAttendanceMap] = useState<Map<string, CourseAttendance>>(new Map())
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCourses, setTotalCourses] = useState(0)

  const [formOpen, setFormOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [formCode, setFormCode] = useState('')
  const [formName, setFormName] = useState('')
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [detailCourse, setDetailCourse] = useState<Course | null>(null)
  const [detailAttendance, setDetailAttendance] = useState<CourseAttendance | null>(null)
  const [detailEvents, setDetailEvents] = useState<EventItem[]>([])
  const [detailEventsLoading, setDetailEventsLoading] = useState(false)
  const [detailTab, setDetailTab] = useState('overview')

  const fetchCourses = useCallback(async () => {
    setLoading(true)
    try {
      const q = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''
      const result = await apiClient<{ data: Course[]; total: number }>(
        `/courses?page=${currentPage}&limit=${PAGE_SIZE}${q}`,
        { authenticated: true }
      )
      setCourses(result.data)
      setTotalCourses(result.total)
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 401) {
        router.replace('/admin-login')
      }
    } finally {
      setLoading(false)
    }
  }, [router, currentPage, searchQuery])

  const fetchAttendance = useCallback(async () => {
    try {
      const result = await apiClient<{ data: CourseAttendance[] }>(
        '/reports/courses?limit=1000',
        { authenticated: true }
      )
      const map = new Map<string, CourseAttendance>()
      for (const c of result.data) {
        map.set(c.id, c)
      }
      setAttendanceMap(map)
    } catch {
      /* silently fail */
    }
  }, [])

  useEffect(() => {
    fetchCourses()
    fetchAttendance()
  }, [fetchCourses, fetchAttendance])

  const rows: CourseRow[] = useMemo(
    () =>
      courses.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        events: c._count?.events ?? 0,
        students: c._count?.students ?? 0,
        attendanceRate: attendanceMap.get(c.id)?.attendanceRate ?? null,
      })),
    [courses, attendanceMap]
  )

  const pageCount = Math.max(1, Math.ceil(totalCourses / PAGE_SIZE))
  const clampedPage = Math.min(currentPage, pageCount)
  const paginatedRows = rows

  const openCreate = useCallback(() => {
    setEditingCourse(null)
    setFormCode('')
    setFormName('')
    setFormError('')
    setFormOpen(true)
  }, [])

  const openEdit = useCallback((course: Course) => {
    setEditingCourse(course)
    setFormCode(course.code)
    setFormName(course.name)
    setFormError('')
    setFormOpen(true)
  }, [])

  const handleFormSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setFormSubmitting(true)
      setFormError('')
      try {
        if (editingCourse) {
          await apiClient(`/courses/${editingCourse.id}`, {
            method: 'PUT',
            body: { name: formName },
            authenticated: true,
          })
          toast({ message: 'Course updated', variant: 'success' })
        } else {
          await apiClient('/courses', {
            method: 'POST',
            body: { code: formCode, name: formName },
            authenticated: true,
          })
          toast({ message: 'Course created', variant: 'success' })
        }
        setFormOpen(false)
        fetchCourses()
      } catch (err) {
        if (err instanceof ApiError) {
          setFormError(err.message)
        } else {
          setFormError('An unexpected error occurred')
        }
      } finally {
        setFormSubmitting(false)
      }
    },
    [editingCourse, formCode, formName, toast, fetchCourses]
  )

  const handleDelete = useCallback(
    async (course: Course) => {
      setDeleteTarget(course)
    },
    []
  )

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await apiClient(`/courses/${deleteTarget.id}`, {
        method: 'DELETE',
        authenticated: true,
      })
      toast({ message: 'Course deleted', variant: 'success' })
      setDeleteTarget(null)
      setDetailCourse(null)
      fetchCourses()
    } catch (err) {
      if (err instanceof ApiError) {
        toast({ message: err.message, variant: 'error' })
      } else {
        toast({ message: 'Failed to delete course', variant: 'error' })
      }
    } finally {
      setDeleting(false)
    }
  }, [deleteTarget, toast, fetchCourses])

  const openDetail = useCallback(
    async (course: Course) => {
      setDetailCourse(course)
      setDetailAttendance(attendanceMap.get(course.id) ?? null)
      setDetailTab('overview')
      setDetailEvents([])

      setDetailEventsLoading(true)
      try {
        const result = await apiClient<{ data: EventItem[] }>(
          `/events?courseId=${course.id}&limit=50`,
          { authenticated: true }
        )
        setDetailEvents(result.data)
      } catch {
        setDetailEvents([])
      } finally {
        setDetailEventsLoading(false)
      }
    },
    [attendanceMap]
  )

  const columns: Column<CourseRow>[] = [
    {
      key: 'code',
      header: 'Code',
      sortable: true,
      render: (row) => <Badge variant="brand">{row.code}</Badge>,
    },
    { key: 'name', header: 'Name', sortable: true },
    { key: 'events', header: 'Events', sortable: true },
    { key: 'students', header: 'Students', sortable: true },
    {
      key: 'attendanceRate',
      header: 'Attendance',
      sortable: true,
      render: (row) =>
        row.attendanceRate !== null ? (
          <Badge variant={RATE_BADGE(row.attendanceRate)}>{row.attendanceRate}%</Badge>
        ) : (
          <span className={styles.noData}>—</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      width: '140px',
      render: (row) => (
        <div className={styles.actionBtns}>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              const course = courses.find((c) => c.id === row.id)
              if (course) openDetail(course)
            }}
          >
            View
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              const course = courses.find((c) => c.id === row.id)
              if (course) openEdit(course)
            }}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              const course = courses.find((c) => c.id === row.id)
              if (course) handleDelete(course)
            }}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Courses</h1>
        <Button onClick={openCreate}>Create Course</Button>
      </div>

      <div className={styles.toolbar}>
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by code or name..."
          className={styles.search}
        />
      </div>

      <DataTable
        columns={columns}
        data={paginatedRows}
        getRowId={(r) => r.id}
        loading={loading}
        emptyState={
          <div className={styles.emptyState}>
            <p>No courses found.</p>
            <Button variant="outline" onClick={openCreate}>
              Create your first course
            </Button>
          </div>
        }
        pagination={
          rows.length > 0
            ? { page: clampedPage, pageCount, onPageChange: setCurrentPage }
            : undefined
        }
      />

      {/* Create / Edit Dialog */}
      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingCourse ? 'Edit Course' : 'Create Course'}
        footer={
          <div className={styles.dialogFooter}>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleFormSubmit}
              disabled={formSubmitting || !formName.trim() || (!editingCourse && !formCode.trim())}
            >
              {formSubmitting && <span className={styles.spinner} />}
              {formSubmitting ? 'Saving...' : editingCourse ? 'Update' : 'Create'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleFormSubmit} className={styles.form}>
          {formError && <div className={styles.formError}>{formError}</div>}
          <div className={styles.field}>
            <label className={styles.label}>Course Code</label>
            <Input
              value={formCode}
              onChange={(e) => setFormCode(e.target.value)}
              placeholder="e.g. CS101"
              disabled={!!editingCourse}
              required={!editingCourse}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Course Name</label>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Introduction to Computer Science"
              required
            />
          </div>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Course"
        footer={
          <div className={styles.dialogFooter}>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting && <span className={styles.spinner} />}
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        }
      >
        <p className={styles.deleteText}>
          Are you sure you want to delete <strong>{deleteTarget?.code} — {deleteTarget?.name}</strong>?
          This action cannot be undone.
        </p>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog
        open={!!detailCourse}
        onClose={() => setDetailCourse(null)}
        title={detailCourse ? (
          <div className={styles.drawerHeader}>
            <div className={styles.drawerTitle}>{detailCourse.code}</div>
            <div className={styles.drawerSubtitle}>{detailCourse.name}</div>
          </div>
        ) : undefined}
        bodyClassName={styles.detailDialogBody}
        position="right"
      >
        {detailCourse && (
          <>
            <Tabs tabs={DETAIL_TABS} activeId={detailTab} onChange={setDetailTab} />

            <div className={styles.tabContent}>
              {detailTab === 'overview' && (
                <div className={styles.detailGridPro}>
                  <div className={styles.detailRowPro}>
                    <span className={styles.detailLabelPro}>Code</span>
                    <span className={styles.detailValuePro}>
                      <Badge variant="brand">{detailCourse.code}</Badge>
                    </span>
                  </div>
                  <div className={styles.detailRowPro}>
                    <span className={styles.detailLabelPro}>Name</span>
                    <span className={styles.detailValuePro}>{detailCourse.name}</span>
                  </div>
                  <div className={styles.detailRowPro}>
                    <span className={styles.detailLabelPro}>Events</span>
                    <span className={styles.detailValuePro}>{detailCourse._count?.events ?? 0}</span>
                  </div>
                  <div className={styles.detailRowPro}>
                    <span className={styles.detailLabelPro}>Students</span>
                    <span className={styles.detailValuePro}>{detailCourse._count?.students ?? 0}</span>
                  </div>
                  <div className={styles.detailRowPro}>
                    <span className={styles.detailLabelPro}>Created</span>
                    <span className={styles.detailValuePro}>{new Date(detailCourse.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              )}

              {detailTab === 'attendance' && (
                <>
                  {detailAttendance ? (
                    <div className={styles.attendanceGrid}>
                      <div className={styles.attendanceStat}>
                        <span className={styles.attendanceValue}>{detailAttendance.totalRecords}</span>
                        <span className={styles.attendanceLabel}>Total Records</span>
                      </div>
                      <div className={styles.attendanceStat}>
                        <span className={styles.attendanceValue}>{detailAttendance.present}</span>
                        <span className={styles.attendanceLabel}>Present</span>
                      </div>
                      <div className={styles.attendanceStat}>
                        <span className={styles.attendanceValue}>{detailAttendance.late}</span>
                        <span className={styles.attendanceLabel}>Late</span>
                      </div>
                      <div className={styles.attendanceStat}>
                        <span className={styles.attendanceValue}>{detailAttendance.absent}</span>
                        <span className={styles.attendanceLabel}>Absent</span>
                      </div>
                      <div className={styles.attendanceStat}>
                        <span className={styles.attendanceValue}>
                          {detailAttendance.attendanceRate !== null
                            ? `${detailAttendance.attendanceRate}%`
                            : '—'}
                        </span>
                        <span className={styles.attendanceLabel}>Rate</span>
                      </div>
                      <div className={styles.attendanceStat}>
                        <span className={styles.attendanceValue}>{detailAttendance.totalEvents}</span>
                        <span className={styles.attendanceLabel}>Events</span>
                      </div>
                    </div>
                  ) : (
                    <p className={styles.noData}>No attendance data available.</p>
                  )}
                </>
              )}

              {detailTab === 'events' && (
                <>
                  {detailEventsLoading ? (
                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                      <span className={styles.spinner} />
                    </div>
                  ) : detailEvents.length === 0 ? (
                    <div className={styles.noData}>No events scheduled for this course.</div>
                  ) : (
                    <div className={styles.eventCardList}>
                      {detailEvents.map((evt) => (
                        <div key={evt.id} className={styles.eventCard}>
                          <div className={styles.eventCardLeft}>
                            <div className={styles.eventCardTitle}>{evt.title}</div>
                            <div className={styles.eventCardMeta}>
                              {formatDate(evt.eventDate)} at {formatTime(evt.startTime)} · {evt.venue}
                            </div>
                          </div>
                          <div className={styles.eventCardRight}>
                            {evt.isMandatory && <Badge variant="warning">Mandatory</Badge>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </Dialog>
    </div>
  )
}
