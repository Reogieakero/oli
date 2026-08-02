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
  status: 'upcoming' | 'ongoing' | 'completed'
}

const DETAIL_TABS: Tab[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'attendance', label: 'Attendance' },
]

function getStatus(eventDate: string): 'upcoming' | 'ongoing' | 'completed' {
  const today = new Date()
  const date = parseLocalDate(eventDate)
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)
  if (date.getTime() === today.getTime()) return 'ongoing'
  if (date > today) return 'upcoming'
  return 'completed'
}

function parseLocalDate(value: string): Date {
  const parts = value.split('T')[0].split('-').map(Number)
  if (parts.length === 3) return new Date(parts[0], parts[1] - 1, parts[2])
  return new Date(value)
}

function toTimeInput(value: string): string {
  if (!value) return ''
  const t = value.includes('T') ? value.split('T')[1] : value
  return t.slice(0, 5)
}

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'neutral'> = {
  upcoming: 'success',
  ongoing: 'warning',
  completed: 'neutral',
}

const STATUS_LABEL: Record<string, string> = {
  upcoming: 'Upcoming',
  ongoing: 'Ongoing',
  completed: 'Completed',
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
  const [totalEvents, setTotalEvents] = useState(0)
  const [sortBy, setSortBy] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

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
  const [finalizing, setFinalizing] = useState(false)

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
      const params = new URLSearchParams()
      params.set('page', String(currentPage))
      params.set('limit', String(PAGE_SIZE))
      if (courseFilter) params.set('courseId', courseFilter)
      const result = await apiClient<{ data: EventItem[]; total: number }>(
        `/events?${params.toString()}`,
        { authenticated: true }
      )
      setEvents(result.data)
      setTotalEvents(result.total)
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 401) {
        router.replace('/admin-login')
      }
    } finally {
      setLoading(false)
    }
  }, [router, currentPage, courseFilter])

  const fetchCourses = useCallback(async () => {
    try {
      const result = await apiClient<{ data: Course[] }>('/courses?limit=1000', {
        authenticated: true,
      })
      setCourses(result.data)
    } catch {
      /* silently fail */
    }
  }, [])

  const fetchAttendance = useCallback(async () => {
    try {
      const result = await apiClient<{ data: EventAttendance[] }>('/reports/events?limit=1000', {
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
    { value: 'ongoing', label: 'Ongoing' },
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

  const pageCount = Math.max(1, Math.ceil(totalEvents / PAGE_SIZE))
  const clampedPage = Math.min(currentPage, pageCount)

  const sortedRows = useMemo(() => {
    if (!sortBy) return rows
    const dir = sortOrder === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const av = a[sortBy as keyof EventRow]
      const bv = b[sortBy as keyof EventRow]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
      return String(av).localeCompare(String(bv)) * dir
    })
  }, [rows, sortBy, sortOrder])

  const paginatedRows = sortedRows.slice(
    (clampedPage - 1) * PAGE_SIZE,
    clampedPage * PAGE_SIZE
  )

  const handleSortChange = useCallback((sort: { key: string; direction: 'asc' | 'desc' } | null) => {
    if (sort) {
      setSortBy(sort.key)
      setSortOrder(sort.direction)
    } else {
      setSortBy('')
      setSortOrder('asc')
    }
    setCurrentPage(1)
  }, [])

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
    setFormStartTime(toTimeInput(event.startTime))
    setFormEndTime(toTimeInput(event.endTime))
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

  const handleFinalize = useCallback(async (eventId: string) => {
    setFinalizing(true)
    try {
      const result = await apiClient<{ finalized: boolean; recordsCreated: number }>(
        `/events/${eventId}/finalize`,
        { method: 'POST', authenticated: true }
      )
      toast({ message: `Finalized — ${result.recordsCreated} absent record(s) created`, variant: 'success' })
      fetchEvents()
      fetchAttendance()
    } catch (err) {
      if (err instanceof ApiError) {
        toast({ message: err.message, variant: 'error' })
      } else {
        toast({ message: 'Failed to finalize event', variant: 'error' })
      }
    } finally {
      setFinalizing(false)
    }
  }, [toast, fetchEvents, fetchAttendance])

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
    { key: 'eventDate', header: 'Date', sortable: true, render: (row) => parseLocalDate(row.eventDate).toLocaleDateString() },
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
      render: (row) => <Badge variant={STATUS_BADGE[row.status] ?? 'neutral'}>{STATUS_LABEL[row.status] ?? row.status}</Badge>,
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
        sortState={sortBy ? { key: sortBy, direction: sortOrder } : null}
        onSortChange={handleSortChange}
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
        fullscreen={formStep === 'form'}
        className={formStep === 'preview' ? styles.formReviewDialog : styles.formDialog}
        bodyClassName={styles.formDialogBody}
        footer={
          formStep === 'preview' ? (
            <div className={styles.dialogFooter}>
              <Button variant="outline" onClick={handleBackToForm}>
                Back / Edit
              </Button>
              <Button onClick={handleConfirmSubmit} disabled={formSubmitting}>
                {formSubmitting && <span className={styles.spinner} />}
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
              <div className={styles.reviewHeader}>
                <h3 className={styles.reviewTitle}>{formTitle}</h3>
                <div className={styles.reviewSubtitle}>
                  <Badge variant={formIsMandatory ? 'warning' : 'neutral'}>
                    {formIsMandatory ? 'Mandatory' : 'Optional'}
                  </Badge>
                  <span>{formatTime(formStartTime)} – {formatTime(formEndTime)}</span>
                </div>
              </div>
              <div className={styles.detailGridPro}>
                <div className={styles.detailRowPro}>
                  <span className={styles.detailLabelPro}>Venue</span>
                  <span className={styles.detailValuePro}>{formVenue}</span>
                </div>
                <div className={styles.detailRowPro}>
                  <span className={styles.detailLabelPro}>Date</span>
                  <span className={styles.detailValuePro}>{new Date(formEventDate + 'T00:00:00').toLocaleDateString()}</span>
                </div>
                <div className={styles.detailRowPro}>
                  <span className={styles.detailLabelPro}>Late Cutoff</span>
                  <span className={styles.detailValuePro}>{formLateCutoff} min</span>
                </div>
                <div className={styles.detailRowPro}>
                  <span className={styles.detailLabelPro}>Course</span>
                  <span className={styles.detailValuePro}>
                    {(() => {
                      const c = courses.find((co) => co.id === formCourseId)
                      return c ? <Badge variant="brand">{c.code}</Badge> : <span className={styles.muted}>—</span>
                    })()}
                  </span>
                </div>
                <div className={styles.detailRowPro}>
                  <span className={styles.detailLabelPro}>Year Level</span>
                  <span className={styles.detailValuePro}>{formYearLevel ? `Year ${formYearLevel}` : 'All'}</span>
                </div>
                <div className={styles.detailRowPro}>
                  <span className={styles.detailLabelPro}>Passcode</span>
                  <span className={styles.detailValuePro}>
                    <code className={styles.passcode}>{formPasscode}</code>
                  </span>
                </div>
                <div className={styles.detailRowPro}>
                  <span className={styles.detailLabelPro}>Passcode Expiry</span>
                  <span className={styles.detailValuePro}>{formPasscodeExpiryDate && formPasscodeExpiryTime ? new Date(`${formPasscodeExpiryDate}T${formPasscodeExpiryTime}:00`).toLocaleString() : 'Never'}</span>
                </div>
                {formDescription.trim() && (
                  <div className={styles.reviewDescription}>
                    <span className={styles.detailLabelPro}>Description</span>
                    <p className={styles.reviewDescriptionText}>{formDescription}</p>
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
              {deleting && <span className={styles.spinner} />}
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
        title={detailEvent ? (
          <div className={styles.drawerHeader}>
            <div className={styles.drawerTitle}>{detailEvent.title}</div>
            <div className={styles.drawerSubtitle}>
              {detailEvent.course ? (
                <Badge variant="brand">{detailEvent.course.code}</Badge>
              ) : null}
              <span>{detailEvent.targetYearLevel ? `Year ${detailEvent.targetYearLevel}` : 'All Years'}</span>
            </div>
          </div>
        ) : undefined}
        position="right"
        className={styles.detailDialog}
        bodyClassName={styles.detailDialogBody}
        footer={
          <div className={styles.dialogFooter}>
            <div className={styles.dialogFooterLeft}>
              {detailEvent && (
                <Button variant="destructive" onClick={() => { setDeleteTarget(detailEvent); setDetailEventId(null); }}>
                  Delete
                </Button>
              )}
              {detailEvent && getStatus(detailEvent.eventDate) === 'completed' && (
                <Button variant="primary" onClick={() => handleFinalize(detailEvent.id)} disabled={finalizing}>
                  {finalizing ? 'Finalizing...' : 'Finalize'}
                </Button>
              )}
            </div>
            <div className={styles.dialogFooterRight}>
              {detailEvent && (
                <Button variant="outline" onClick={() => { openEdit(detailEvent); setDetailEventId(null); }}>
                  Edit Details
                </Button>
              )}
              <Button variant="outline" onClick={() => { setDetailEventId(null); setDetailTab('overview') }}>
                Close
              </Button>
            </div>
          </div>
        }
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
                <div className={styles.detailGridPro}>
                  <div className={styles.detailRowPro}>
                    <span className={styles.detailLabelPro}>Status</span>
                    <span className={styles.detailValuePro}>
                      <Badge variant={STATUS_BADGE[getStatus(detailEvent.eventDate)]}>
                        {STATUS_LABEL[getStatus(detailEvent.eventDate)]}
                      </Badge>
                    </span>
                  </div>
                  <div className={styles.detailRowPro}>
                    <span className={styles.detailLabelPro}>Active</span>
                    <span className={styles.detailValuePro}>
                      <Badge variant={detailEvent.isActive ? 'success' : 'danger'}>
                        {detailEvent.isActive ? 'Yes' : 'No'}
                      </Badge>
                    </span>
                  </div>
                  <div className={styles.detailRowPro}>
                    <span className={styles.detailLabelPro}>Date</span>
                    <span className={styles.detailValuePro}>{parseLocalDate(detailEvent.eventDate).toLocaleDateString()}</span>
                  </div>
                  <div className={styles.detailRowPro}>
                    <span className={styles.detailLabelPro}>Time</span>
                    <span className={styles.detailValuePro}>{formatTime(detailEvent.startTime)} – {formatTime(detailEvent.endTime)}</span>
                  </div>
                  <div className={styles.detailRowPro}>
                    <span className={styles.detailLabelPro}>Venue</span>
                    <span className={styles.detailValuePro}>{detailEvent.venue}</span>
                  </div>
                  <div className={styles.detailRowPro}>
                    <span className={styles.detailLabelPro}>Mandatory</span>
                    <span className={styles.detailValuePro}>
                      <Badge variant={detailEvent.isMandatory ? 'warning' : 'neutral'}>
                        {detailEvent.isMandatory ? 'Yes' : 'No'}
                      </Badge>
                    </span>
                  </div>
                  <div className={styles.detailRowPro}>
                    <span className={styles.detailLabelPro}>Organizer</span>
                    <span className={styles.detailValuePro}>{detailEvent.faculty?.fullName ?? '—'}</span>
                  </div>
                  <div className={styles.detailRowPro}>
                    <span className={styles.detailLabelPro}>Passcode</span>
                    <span className={styles.detailValuePro}>
                      <code className={styles.passcode}>{detailEvent.programPasscode}</code>
                    </span>
                  </div>
                  <div className={styles.detailRowPro}>
                    <span className={styles.detailLabelPro}>Passcode Expiry</span>
                    <span className={styles.detailValuePro}>{detailEvent.passcodeExpiresAt ? new Date(detailEvent.passcodeExpiresAt).toLocaleString() : 'Never'}</span>
                  </div>
                  <div className={styles.detailRowPro}>
                    <span className={styles.detailLabelPro}>Late Cutoff</span>
                    <span className={styles.detailValuePro}>{detailEvent.lateCutoffTime} min</span>
                  </div>
                  <div className={styles.detailRowPro}>
                    <span className={styles.detailLabelPro}>Created</span>
                    <span className={styles.detailValuePro}>{new Date(detailEvent.createdAt).toLocaleDateString()}</span>
                  </div>
                  {detailEvent.description && (
                    <div className={styles.detailRowPro}>
                      <span className={styles.detailLabelPro}>Description</span>
                      <span className={styles.detailValuePro}>{detailEvent.description}</span>
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
