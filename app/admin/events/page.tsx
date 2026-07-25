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
import { TimePicker } from '@/components/ui/TimePicker/TimePicker'
import { Tabs, type Tab } from '@/components/ui/Tabs/Tabs'
import { useToast } from '@/components/ui/Toast/Toast'
import { LoadingOverlay } from '@/components/ui/LoadingOverlay/LoadingOverlay'
import styles from './page.module.css'

const PAGE_SIZE = 10

interface Course {
  id: string
  code: string
  name: string
}

interface EventItem {
  id: string
  title: string
  description: string | null
  importantNotice: string | null
  coverPhoto: string | null
  coverPhotoFileName: string | null
  venue: string
  eventDate: string
  startTime: string
  endTime: string
  lateCutoffTime: number
  isMandatory: boolean
  isActive: boolean
  targetYearLevel: number | null
  programPasscode: string
  passcodeExpiresAt: string | null
  createdAt: string
  updatedAt: string
  courseId: string | null
  course: { code: string; name: string } | null
  faculty?: { fullName: string }
  _count?: { attendanceRecords: number }
}

interface EventAttendance {
  id: string
  title: string
  eventDate: string
  course: { code: string; name: string } | null
  totalStudents: number
  present: number
  late: number
  absent: number
  attendanceRate: number | null
}

interface EventRow {
  id: string
  title: string
  courseCode: string | null
  courseName: string | null
  eventDate: string
  venue: string
  isMandatory: boolean
  isActive: boolean
  facultyName: string
  recordCount: number
  attendanceRate: number | null
  status: 'upcoming' | 'today' | 'completed'
}

const DETAIL_TABS: Tab[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'attendance', label: 'Attendance' },
]

function getStatus(eventDate: string): 'upcoming' | 'today' | 'completed' {
  const today = new Date()
  const date = new Date(eventDate)
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)
  if (date.getTime() === today.getTime()) return 'today'
  if (date > today) return 'upcoming'
  return 'completed'
}

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'neutral'> = {
  upcoming: 'success',
  today: 'warning',
  completed: 'neutral',
}

const RATE_BADGE = (rate: number | null): 'success' | 'warning' | 'danger' => {
  if (rate === null) return 'danger'
  if (rate >= 75) return 'success'
  if (rate >= 50) return 'warning'
  return 'danger'
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

export default function AdminEventsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formBodyRef = useRef<HTMLDivElement>(null)
  const [showScrollDown, setShowScrollDown] = useState(false)

  function autoGrow(el: HTMLTextAreaElement) {
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }

  function handleScroll() {
    const el = formBodyRef.current
    if (!el) return
    setShowScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 20)
  }

  function scrollDown() {
    const el = formBodyRef.current
    if (!el) return
    el.scrollBy({ top: el.clientHeight * 0.8, behavior: 'smooth' })
  }

  const [events, setEvents] = useState<EventItem[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [attendanceMap, setAttendanceMap] = useState<Map<string, EventAttendance>>(new Map())
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [courseFilter, setCourseFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const [formOpen, setFormOpen] = useState(false)
  const [formStep, setFormStep] = useState<'form' | 'preview'>('form')
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formImportantNotice, setFormImportantNotice] = useState('')
  const [formVenue, setFormVenue] = useState('')
  const [formEventDate, setFormEventDate] = useState('')
  const [formStartTime, setFormStartTime] = useState('')
  const [formEndTime, setFormEndTime] = useState('')
  const [formLateCutoff, setFormLateCutoff] = useState(15)
  const [formIsMandatory, setFormIsMandatory] = useState(false)
  const [formCourseId, setFormCourseId] = useState('')
  const [formYearLevel, setFormYearLevel] = useState('')
  const [formPasscode, setFormPasscode] = useState('')
  const [formPasscodeExpiryDate, setFormPasscodeExpiryDate] = useState('')
  const [formPasscodeExpiryTime, setFormPasscodeExpiryTime] = useState('')
  const [formCoverFile, setFormCoverFile] = useState<File | null>(null)
  const [formCoverPreview, setFormCoverPreview] = useState<string | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<EventItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [detailEventId, setDetailEventId] = useState<string | null>(null)
  const [detailTab, setDetailTab] = useState('overview')
  const [detailCoverUrl, setDetailCoverUrl] = useState<string | null>(null)

  const detailEvent = useMemo(
    () => events.find((e) => e.id === detailEventId) ?? null,
    [events, detailEventId]
  )

  const detailAttendance = useMemo(
    () => (detailEventId ? attendanceMap.get(detailEventId) ?? null : null),
    [detailEventId, attendanceMap]
  )

  const fetchEvents = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '200' })
      if (courseFilter) params.set('courseId', courseFilter)
      const result = await apiClient<{ data: EventItem[]; total: number }>(
        `/events?${params.toString()}`,
        { authenticated: true }
      )
      setEvents(result.data)
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 401) {
        router.replace('/admin-login')
      }
    } finally {
      setLoading(false)
    }
  }, [router, courseFilter])

  const fetchCourses = useCallback(async () => {
    try {
      const result = await apiClient<{ data: Course[] }>('/courses?limit=200', {
        authenticated: true,
      })
      setCourses(result.data)
    } catch {
      /* silently fail */
    }
  }, [])

  const fetchAttendance = useCallback(async () => {
    try {
      const result = await apiClient<{ data: EventAttendance[] }>('/reports/events?limit=200', {
        authenticated: true,
      })
      const map = new Map<string, EventAttendance>()
      for (const e of result.data) {
        map.set(e.id, e)
      }
      setAttendanceMap(map)
    } catch {
      /* silently fail */
    }
  }, [])

  useEffect(() => {
    fetchEvents()
    fetchCourses()
    fetchAttendance()
  }, [fetchEvents, fetchCourses, fetchAttendance])

  const loadDetailCover = useCallback(async (eventId: string) => {
    try {
      const result = await apiClient<{ signedUrl: string | null }>(
        `/events/${eventId}/cover-url`,
        { authenticated: true }
      )
      setDetailCoverUrl(result.signedUrl)
    } catch {
      setDetailCoverUrl(null)
    }
  }, [])

  const courseOptions: SelectOption[] = useMemo(
    () => [{ value: '', label: 'All Courses' }, ...courses.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))],
    [courses]
  )

  const statusOptions: SelectOption[] = [
    { value: '', label: 'All Status' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'today', label: 'Today' },
    { value: 'completed', label: 'Completed' },
  ]

  const todayStr = useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }, [])

  const expiryTimeMin = useMemo(() => {
    if (formPasscodeExpiryDate !== todayStr) return ''
    const now = new Date()
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  }, [formPasscodeExpiryDate, todayStr])

  const yearLevelOptions: SelectOption[] = [
    { value: '', label: 'All Year Levels' },
    { value: '1', label: 'Year 1' },
    { value: '2', label: 'Year 2' },
    { value: '3', label: 'Year 3' },
    { value: '4', label: 'Year 4' },
  ]

  const rows: EventRow[] = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return events
      .filter((e) => {
        const status = getStatus(e.eventDate)
        if (statusFilter && status !== statusFilter) return false
        if (!q) return true
        return (
          e.title.toLowerCase().includes(q) ||
          e.venue.toLowerCase().includes(q) ||
          (e.course?.code ?? '').toLowerCase().includes(q) ||
          (e.course?.name ?? '').toLowerCase().includes(q) ||
          (e.faculty?.fullName ?? '').toLowerCase().includes(q)
        )
      })
      .map((e) => ({
        id: e.id,
        title: e.title,
        courseCode: e.course?.code ?? null,
        courseName: e.course?.name ?? null,
        eventDate: e.eventDate,
        venue: e.venue,
        isMandatory: e.isMandatory,
        isActive: e.isActive,
        facultyName: e.faculty?.fullName ?? '',
        recordCount: e._count?.attendanceRecords ?? 0,
        attendanceRate: attendanceMap.get(e.id)?.attendanceRate ?? null,
        status: getStatus(e.eventDate),
      }))
  }, [events, searchQuery, statusFilter, attendanceMap])

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const clampedPage = Math.min(currentPage, pageCount)
  const paginatedRows = rows.slice(
    (clampedPage - 1) * PAGE_SIZE,
    clampedPage * PAGE_SIZE
  )

  const resetForm = useCallback(() => {
    setFormTitle('')
    setFormDescription('')
    setFormImportantNotice('')
    setFormVenue('')
    setFormEventDate('')
    setFormStartTime('')
    setFormEndTime('')
    setFormLateCutoff(15)
    setFormIsMandatory(false)
    setFormCourseId('')
    setFormYearLevel('')
    setFormPasscode('')
    setFormPasscodeExpiryDate('')
    setFormPasscodeExpiryTime('')
    setFormCoverFile(null)
    setFormCoverPreview(null)
    setFormError('')
    setFormStep('form')
    handleGeneratePasscode()
  }, [])

  const openCreate = useCallback(() => {
    setEditingEvent(null)
    resetForm()
    setFormOpen(true)
  }, [resetForm])

  const openEdit = useCallback((event: EventItem) => {
    setEditingEvent(event)
    setFormStep('form')
    setFormTitle(event.title)
    setFormDescription(event.description ?? '')
    setFormImportantNotice(event.importantNotice ?? '')
    setFormVenue(event.venue)
    setFormEventDate(event.eventDate.split('T')[0])
    setFormStartTime(event.startTime.slice(11, 16))
    setFormEndTime(event.endTime.slice(11, 16))
    setFormLateCutoff(event.lateCutoffTime)
    setFormIsMandatory(event.isMandatory)
    setFormCourseId(event.courseId ?? '')
    setFormYearLevel(event.targetYearLevel?.toString() ?? '')
    setFormPasscode(event.programPasscode)
    if (event.passcodeExpiresAt) {
      const d = new Date(event.passcodeExpiresAt)
      setFormPasscodeExpiryDate(d.toISOString().split('T')[0])
      setFormPasscodeExpiryTime(d.toTimeString().slice(0, 5))
    } else {
      setFormPasscodeExpiryDate('')
      setFormPasscodeExpiryTime('')
    }
    setFormCoverFile(null)
    setFormCoverPreview(null)
    setFormError('')
    setFormOpen(true)
  }, [])

  const handleGeneratePasscode = useCallback(() => {
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    setFormPasscode(code)
  }, [])

  const handleCoverSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFormCoverFile(file)
    setFormCoverPreview(URL.createObjectURL(file))
  }, [])

  const handleRemoveCover = useCallback(() => {
    setFormCoverFile(null)
    setFormCoverPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const handleFormSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setFormError('')

      if (!formPasscode) {
        setFormError('Passcode is required. Generate one.')
        return
      }

      const passcodeExpiresAt =
        formPasscodeExpiryDate && formPasscodeExpiryTime
          ? `${formPasscodeExpiryDate}T${formPasscodeExpiryTime}:00`
          : null

      if (passcodeExpiresAt && new Date(passcodeExpiresAt) <= new Date()) {
        setFormError('Passcode expiry must be in the future.')
        return
      }

      setFormStep('preview')
    },
    [formPasscode, formPasscodeExpiryDate, formPasscodeExpiryTime]
  )

  const handleBackToForm = useCallback(() => {
    setFormError('')
    setFormStep('form')
  }, [])

  const handleConfirmSubmit = useCallback(async () => {
    setFormSubmitting(true)
    setFormError('')

    const passcodeExpiresAt =
      formPasscodeExpiryDate && formPasscodeExpiryTime
        ? `${formPasscodeExpiryDate}T${formPasscodeExpiryTime}:00`
        : null

    try {
      const body = new FormData()
      body.append('title', formTitle)
      if (formDescription) body.append('description', formDescription)
      if (formImportantNotice) body.append('importantNotice', formImportantNotice)
      body.append('venue', formVenue)
      body.append('eventDate', formEventDate)
      body.append('startTime', formStartTime)
      body.append('endTime', formEndTime)
      body.append('lateCutoffTime', String(formLateCutoff))
      body.append('isMandatory', String(formIsMandatory))
      if (formCourseId) body.append('courseId', formCourseId)
      if (formYearLevel) body.append('targetYearLevel', formYearLevel)
      body.append('programPasscode', formPasscode)
      if (passcodeExpiresAt) body.append('passcodeExpiresAt', passcodeExpiresAt)
      if (formCoverFile) body.append('coverPhoto', formCoverFile)

      if (editingEvent) {
        await apiClient(`/events/${editingEvent.id}`, {
          method: 'PUT',
          body,
          authenticated: true,
        })
        toast({ message: 'Event updated', variant: 'success' })
      } else {
        await apiClient('/events', {
          method: 'POST',
          body,
          authenticated: true,
        })
        toast({ message: 'Event created', variant: 'success' })
      }
      setFormOpen(false)
      setFormStep('form')
      fetchEvents()
      fetchAttendance()
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message)
      } else {
        setFormError('An unexpected error occurred')
      }
    } finally {
      setFormSubmitting(false)
    }
  }, [
    editingEvent, formTitle, formDescription, formImportantNotice, formVenue, formEventDate,
    formStartTime, formEndTime, formLateCutoff, formIsMandatory, formCourseId, formYearLevel,
    formPasscode,
    formPasscodeExpiryDate, formPasscodeExpiryTime, formCoverFile,
    toast, fetchEvents, fetchAttendance,
  ])

  const handleDelete = useCallback((event: EventItem) => {
    setDeleteTarget(event)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await apiClient(`/events/${deleteTarget.id}`, {
        method: 'DELETE',
        authenticated: true,
      })
      toast({ message: 'Event deleted', variant: 'success' })
      setDeleteTarget(null)
      setDetailEventId(null)
      fetchEvents()
      fetchAttendance()
    } catch (err) {
      if (err instanceof ApiError) {
        toast({ message: err.message, variant: 'error' })
      } else {
        toast({ message: 'Failed to delete event', variant: 'error' })
      }
    } finally {
      setDeleting(false)
    }
  }, [deleteTarget, toast, fetchEvents, fetchAttendance])

  const openDetail = useCallback(
    async (eventId: string) => {
      setDetailEventId(eventId)
      setDetailTab('overview')
      setDetailCoverUrl(null)
      if (eventId) loadDetailCover(eventId)
    },
    [loadDetailCover]
  )

  const columns: Column<EventRow>[] = [
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      render: (row) => (
        <span className={row.isActive ? styles.titleActive : styles.titleInactive}>
          {row.title}
          {row.isMandatory && <Badge variant="warning" className={styles.mandatoryBadge}>Required</Badge>}
        </span>
      ),
    },
    {
      key: 'courseCode',
      header: 'Course',
      sortable: true,
      render: (row) =>
        row.courseCode ? <Badge variant="brand">{row.courseCode}</Badge> : <span className={styles.muted}>—</span>,
    },
    { key: 'eventDate', header: 'Date', sortable: true, render: (row) => new Date(row.eventDate).toLocaleDateString() },
    { key: 'venue', header: 'Venue', sortable: true },
    {
      key: 'attendanceRate',
      header: 'Attendance',
      sortable: true,
      render: (row) =>
        row.attendanceRate !== null ? (
          <Badge variant={RATE_BADGE(row.attendanceRate)}>{row.attendanceRate}%</Badge>
        ) : (
          <span className={styles.muted}>—</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => <Badge variant={STATUS_BADGE[row.status] ?? 'neutral'}>{row.status}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      width: '180px',
      render: (row) => (
        <div className={styles.actionBtns}>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openDetail(row.id) }}>
            View
          </Button>
          <Button variant="ghost" size="sm" onClick={(e) => {
            e.stopPropagation()
            const event = events.find((ev) => ev.id === row.id)
            if (event) openEdit(event)
          }}>
            Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={(e) => {
            e.stopPropagation()
            const event = events.find((ev) => ev.id === row.id)
            if (event) handleDelete(event)
          }}>
            Delete
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Events</h1>
        <div className={styles.headerRight}>
          <Button onClick={openCreate}>Create Event</Button>
        </div>
      </div>

      <div className={styles.toolbar}>
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by title, venue, course..."
          className={styles.search}
        />
        <Select
          value={courseFilter}
          onChange={(e) => { setCourseFilter(e.target.value); setCurrentPage(1) }}
          options={courseOptions}
          className={styles.filterSelect}
        />
        <Select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1) }}
          options={statusOptions}
          className={styles.filterSelect}
        />
      </div>

      <DataTable
        columns={columns}
        data={paginatedRows}
        getRowId={(r) => r.id}
        loading={loading}
        emptyState={
          <div className={styles.emptyState}>
            <p>No events found.</p>
            <Button variant="outline" onClick={openCreate}>
              Create your first event
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
        onClose={() => { setFormStep('form'); setFormOpen(false) }}
        title={editingEvent ? 'Edit Event' : 'Create Event'}
        fullscreen
        className={styles.formDialog}
        bodyClassName={styles.formDialogBody}
        footer={
          formStep === 'preview' ? (
            <div className={styles.dialogFooter}>
              <Button variant="outline" onClick={handleBackToForm}>
                Back / Edit
              </Button>
              <Button onClick={handleConfirmSubmit} disabled={formSubmitting}>
                {formSubmitting ? 'Saving...' : editingEvent ? 'Confirm & Save Changes' : 'Confirm & Publish'}
              </Button>
            </div>
          ) : (
            <div className={styles.dialogFooter}>
              <Button variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleFormSubmit}
                disabled={!formTitle.trim() || !formVenue.trim() || !formEventDate || !formStartTime || !formEndTime}
              >
                Review
              </Button>
            </div>
          )
        }
      >
        {formStep === 'preview' ? (
          <div ref={formBodyRef} className={styles.formScrollContainer} onScroll={handleScroll}>
            {showScrollDown && (
              <button type="button" className={styles.scrollDownBtn} onClick={scrollDown} aria-label="Scroll down">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
            <LoadingOverlay visible={formSubmitting} message={editingEvent ? 'Updating event...' : 'Creating event...'}>
              <div className={styles.detailGrid}>
                {formCoverPreview && (
                  <div className={styles.detailCover}>
                    <img src={formCoverPreview} alt="Cover" className={styles.detailCoverImage} />
                  </div>
                )}
                {formImportantNotice.trim() && (
                  <div className={styles.noticeBanner}>
                    <strong>Important Notice:</strong> {formImportantNotice}
                  </div>
                )}
                {formError && <div className={styles.formError}>{formError}</div>}
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Title</span>
                  <span>{formTitle}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Venue</span>
                  <span>{formVenue}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Date</span>
                  <span>{new Date(formEventDate + 'T00:00:00').toLocaleDateString()}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Time</span>
                  <span>{formatTime(formStartTime)} – {formatTime(formEndTime)}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Late Cutoff</span>
                  <span>{formLateCutoff} min</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Course</span>
                  {(() => {
                    const c = courses.find((co) => co.id === formCourseId)
                    return c ? <Badge variant="brand">{c.code}</Badge> : <span className={styles.muted}>—</span>
                  })()}
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Year Level</span>
                  <span>{formYearLevel ? `Year ${formYearLevel}` : 'All'}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Mandatory</span>
                  <Badge variant={formIsMandatory ? 'warning' : 'neutral'}>{formIsMandatory ? 'Yes' : 'No'}</Badge>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Passcode</span>
                  <code className={styles.passcode}>{formPasscode}</code>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Passcode Expiry</span>
                  <span>{formPasscodeExpiryDate && formPasscodeExpiryTime ? new Date(`${formPasscodeExpiryDate}T${formPasscodeExpiryTime}:00`).toLocaleString() : 'Never'}</span>
                </div>
                {formDescription.trim() && (
                  <div className={styles.detailItemFull}>
                    <span className={styles.detailLabel}>Description</span>
                    <p className={styles.detailDescription}>{formDescription}</p>
                  </div>
                )}
              </div>
            </LoadingOverlay>
          </div>
        ) : (
          <div ref={formBodyRef} className={styles.formScrollContainer} onScroll={handleScroll}>
            {showScrollDown && (
              <button type="button" className={styles.scrollDownBtn} onClick={scrollDown} aria-label="Scroll down">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
            <form onSubmit={handleFormSubmit} className={styles.form}>
            {formError && <div className={styles.formError}>{formError}</div>}

            {/* Cover Photo */}
            <div className={styles.field}>
              <label className={styles.label}>Cover Photo</label>
              <div className={styles.coverUpload}>
                {formCoverPreview ? (
                  <div className={styles.coverPreview}>
                    <img src={formCoverPreview} alt="Cover preview" className={styles.coverImage} />
                    <Button variant="ghost" size="sm" onClick={handleRemoveCover} type="button">Remove</Button>
                  </div>
                ) : (
                  <div className={styles.coverPlaceholder} onClick={() => fileInputRef.current?.click()}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                      <circle cx="8.5" cy="9.5" r="1.5" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M21 15l-5-5L6 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Click to upload cover photo</span>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverSelect}
                  className={styles.fileInput}
                />
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label}>Title</label>
                <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="e.g. Midterm Exam" required inputMode="text" />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Venue</label>
                <Input value={formVenue} onChange={(e) => setFormVenue(e.target.value)} placeholder="e.g. Room 301" required inputMode="text" />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Date</label>
                <DatePicker value={formEventDate} onChange={setFormEventDate} placeholder="Select date" minDate={todayStr} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Start Time</label>
                <TimePicker value={formStartTime} onChange={setFormStartTime} placeholder="Select time" />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>End Time</label>
                <TimePicker value={formEndTime} onChange={setFormEndTime} placeholder="Select time" />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Late Cutoff (min)</label>
                <Input type="number" min={0} value={formLateCutoff} onChange={(e) => setFormLateCutoff(parseInt(e.target.value, 10) || 0)} inputMode="numeric" />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Course</label>
                <Select value={formCourseId} onChange={(e) => setFormCourseId(e.target.value)} options={[{ value: '', label: 'No course' }, ...courses.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))]} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Year Level</label>
                <Select value={formYearLevel} onChange={(e) => setFormYearLevel(e.target.value)} options={yearLevelOptions} />
              </div>

              {/* Passcode */}
              <div className={styles.field}>
                <label className={styles.label}>Passcode</label>
                <div className={styles.passcodeAuto}>
                  <Input
                    value={formPasscode}
                    placeholder="Click generate for a passcode"
                    readOnly
                    className={styles.passcodeInput}
                  />
                  <Button variant="outline" size="sm" type="button" onClick={handleGeneratePasscode} className={styles.passcodeGenBtn}>
                    Generate
                  </Button>
                </div>
              </div>

              {/* Passcode Expiry & Mandatory */}
              <div className={styles.field}>
                <label className={styles.label}>Passcode Expiry</label>
                <div className={styles.expiryRow}>
                  <DatePicker value={formPasscodeExpiryDate} onChange={setFormPasscodeExpiryDate} placeholder="Expiry date" minDate={todayStr} />
                  <TimePicker value={formPasscodeExpiryTime} onChange={setFormPasscodeExpiryTime} placeholder="Expiry time" minTime={expiryTimeMin} />
                  <label className={styles.checkboxLabel}>
                    <input type="checkbox" checked={formIsMandatory} onChange={(e) => setFormIsMandatory(e.target.checked)} className={styles.checkbox} />
                    Mandatory
                  </label>
                </div>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Important Notice</label>
              <textarea
                value={formImportantNotice}
                onChange={(e) => { setFormImportantNotice(e.target.value); autoGrow(e.target) }}
                onInput={(e) => autoGrow(e.currentTarget)}
                placeholder="Optional important notice for attendees..."
                className={styles.textarea}
                rows={1}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Description</label>
              <textarea
                value={formDescription}
                onChange={(e) => { setFormDescription(e.target.value); autoGrow(e.target) }}
                onInput={(e) => autoGrow(e.currentTarget)}
                placeholder="Optional description..."
                className={styles.textarea}
                rows={1}
              />
            </div>
          </form>
          </div>
        )}
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Event"
        footer={
          <div className={styles.dialogFooter}>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        }
      >
        <div className={styles.deleteText}>
          <p>Are you sure you want to delete <strong>{deleteTarget?.title}</strong>?</p>
          {deleteTarget && (deleteTarget._count?.attendanceRecords ?? 0) > 0 && (
            <p className={styles.deleteWarning}>
              This event has <strong>{deleteTarget._count?.attendanceRecords ?? 0}</strong> attendance record(s).
              All records will be deleted as well.
            </p>
          )}
          <p>This action cannot be undone.</p>
        </div>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog
        open={!!detailEvent}
        onClose={() => { setDetailEventId(null); setDetailTab('overview') }}
        title={detailEvent ? detailEvent.title : ''}
        className={styles.detailDialog}
        bodyClassName={styles.detailDialogBody}
      >
        {detailEvent && (
          <>
            {detailCoverUrl && (
              <div className={styles.detailCover}>
                <img src={detailCoverUrl} alt="Event cover" className={styles.detailCoverImage} />
              </div>
            )}

            {detailEvent.importantNotice && (
              <div className={styles.noticeBanner}>
                <strong>Important Notice:</strong> {detailEvent.importantNotice}
              </div>
            )}

            <Tabs tabs={DETAIL_TABS} activeId={detailTab} onChange={setDetailTab} />
            <div className={styles.tabContent}>
              {detailTab === 'overview' && (
                <div className={styles.detailGrid}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Status</span>
                    <Badge variant={STATUS_BADGE[getStatus(detailEvent.eventDate)]}>
                      {getStatus(detailEvent.eventDate)}
                    </Badge>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Active</span>
                    <Badge variant={detailEvent.isActive ? 'success' : 'danger'}>
                      {detailEvent.isActive ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Date</span>
                    <span>{new Date(detailEvent.eventDate).toLocaleDateString()}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Time</span>
                    <span>{formatTime(detailEvent.startTime)} – {formatTime(detailEvent.endTime)}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Venue</span>
                    <span>{detailEvent.venue}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Course</span>
                    {detailEvent.course ? (
                      <Badge variant="brand">{detailEvent.course.code}</Badge>
                    ) : (
                      <span className={styles.muted}>—</span>
                    )}
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Mandatory</span>
                    <Badge variant={detailEvent.isMandatory ? 'warning' : 'neutral'}>
                      {detailEvent.isMandatory ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Target Year</span>
                    <span>{detailEvent.targetYearLevel ? `Year ${detailEvent.targetYearLevel}` : 'All'}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Organizer</span>
                    <span>{detailEvent.faculty?.fullName ?? '—'}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Passcode</span>
                    <code className={styles.passcode}>{detailEvent.programPasscode}</code>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Passcode Expiry</span>
                    <span>{detailEvent.passcodeExpiresAt ? new Date(detailEvent.passcodeExpiresAt).toLocaleString() : 'Never'}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Late Cutoff</span>
                    <span>{detailEvent.lateCutoffTime} min</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Created</span>
                    <span>{new Date(detailEvent.createdAt).toLocaleDateString()}</span>
                  </div>
                  {detailEvent.description && (
                    <div className={styles.detailItemFull}>
                      <span className={styles.detailLabel}>Description</span>
                      <p className={styles.detailDescription}>{detailEvent.description}</p>
                    </div>
                  )}
                </div>
              )}

              {detailTab === 'attendance' && (
                <>
                  {detailAttendance ? (
                    <div className={styles.attendanceGrid}>
                      <div className={styles.attendanceStat}>
                        <span className={styles.attendanceValue}>{detailAttendance.totalStudents}</span>
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
                        <span className={styles.attendanceValue}>{detailAttendance.totalStudents}</span>
                        <span className={styles.attendanceLabel}>Students</span>
                      </div>
                    </div>
                  ) : (
                    <p className={styles.muted}>No attendance data available.</p>
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
