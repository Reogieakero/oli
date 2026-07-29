'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient, ApiError } from '@/lib/apiClient'
import { Button } from '@/components/ui/Button/Button'
import { Badge } from '@/components/ui/Badge/Badge'
import { SearchBar } from '@/components/ui/SearchBar/SearchBar'
import { Select, type SelectOption } from '@/components/ui/Select/Select'
import { DatePicker } from '@/components/ui/DatePicker/DatePicker'
import { Input } from '@/components/ui/Input/Input'
import { DataTable, type Column } from '@/components/ui/DataTable/DataTable'
import { Dialog } from '@/components/ui/Dialog/Dialog'
import { LoadingOverlay } from '@/components/ui/LoadingOverlay/LoadingOverlay'
import { useToast } from '@/components/ui/Toast/Toast'
import styles from './page.module.css'

type FormStep = 'form' | 'preview'
type StatusBadgeVariant = 'neutral' | 'success' | 'warning' | 'danger'

const STATUS_BADGE: Record<string, StatusBadgeVariant> = {
  draft: 'neutral',
  published: 'success',
  archived: 'warning',
}

const STATUS_OPTIONS: SelectOption[] = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
]

const YEAR_LEVELS: SelectOption[] = [
  { value: '', label: 'All Years' },
  { value: '1', label: 'Year 1' },
  { value: '2', label: 'Year 2' },
  { value: '3', label: 'Year 3' },
  { value: '4', label: 'Year 4' },
  { value: '5', label: 'Year 5' },
  { value: '6', label: 'Year 6' },
]

const PAGE_SIZE = 20

interface AnnouncementRow {
  id: string
  title: string
  content: string
  course: { id: string; code: string; name: string } | null
  targetYearLevel: number | null
  isGeneral: boolean
  status: string
  publishAt: string | null
  expiresAt: string | null
  faculty: { fullName: string }
  createdAt: string
  updatedAt: string
  attachments: { id: string; fileName: string; fileUrl: string; fileSize: number; mimeType: string }[]
  _count: { reads: number }
}

interface AnnouncementListResponse {
  data: AnnouncementRow[]
  total: number
  page: number
  limit: number
}

interface CourseOption {
  id: string
  code: string
  name: string
}

function autoGrow(el: HTMLTextAreaElement) {
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString()
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function AttachmentPreview({ attachment, onPdfFullscreen }: {
  attachment: { fileName: string; fileUrl: string; fileSize: number; mimeType: string }
  onPdfFullscreen?: (fileUrl: string, title: string, mimeType?: string) => void
}) {
  const [signedUrl, setSignedUrl] = useState('')
  useEffect(() => {
    apiClient<{ signedUrl: string }>(`/announcements/attachments/${encodeURIComponent(attachment.fileUrl)}`, { authenticated: true })
      .then((res) => setSignedUrl(res.signedUrl))
      .catch(() => {})
  }, [attachment.fileUrl])
  return (
    <div className={styles.attachmentCard}>
      <div className={styles.attachmentFileItem}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2Z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <span className={styles.attachmentFileName}>{attachment.fileName}</span>
        <span className={styles.attachmentFileSize}>({formatFileSize(attachment.fileSize)})</span>
      </div>
      {(attachment.mimeType.startsWith('image/') || attachment.mimeType === 'application/pdf') && onPdfFullscreen && signedUrl && (
        <button className={styles.attachmentEyeBtn} onClick={() => onPdfFullscreen(attachment.fileUrl, attachment.fileName, attachment.mimeType)} title="View full screen">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      )}
    </div>
  )
}

export default function AdminAnnouncementsPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [data, setData] = useState<AnnouncementRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCourse, setFilterCourse] = useState('')
  const [courseOptions, setCourseOptions] = useState<SelectOption[]>([])

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [formStep, setFormStep] = useState<FormStep>('form')
  const [editingItem, setEditingItem] = useState<AnnouncementRow | null>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formCourseId, setFormCourseId] = useState('')
  const [formYearLevel, setFormYearLevel] = useState('')
  const [formIsGeneral, setIsGeneral] = useState(false)
  const [formStatus, setFormStatus] = useState('draft')
  const [formPublishAt, setFormPublishAt] = useState('')
  const [formExpiresAt, setFormExpiresAt] = useState('')
  const [formFiles, setFormFiles] = useState<File[]>([])
  const [formFilePreviews, setFormFilePreviews] = useState<string[]>([])
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [detailRecord, setDetailRecord] = useState<AnnouncementRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AnnouncementRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [fullscreenViewer, setFullscreenViewer] = useState<{ url: string; title: string; mimeType?: string } | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set('search', searchQuery)
      if (filterStatus) params.set('status', filterStatus)
      if (filterCourse) params.set('courseId', filterCourse)
      params.set('page', String(page))
      params.set('limit', String(PAGE_SIZE))
      const result = await apiClient<AnnouncementListResponse>(`/announcements?${params.toString()}`, { authenticated: true })
      setData(result.data)
      setTotal(result.total)
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 401) {
        router.replace('/admin-login')
      }
    } finally {
      setLoading(false)
    }
  }, [searchQuery, filterStatus, filterCourse, page, router])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    async function loadCourses() {
      try {
        const res = await apiClient<{ data: CourseOption[] }>('/courses?limit=20', { authenticated: true })
        setCourseOptions(res.data.map((c) => ({ value: c.id, label: c.name })))
      } catch { /* ignore */ }
    }
    loadCourses()
  }, [])

  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => setPage(1), 250)
  }, [])

  const resetForm = useCallback(() => {
    setFormTitle('')
    setFormContent('')
    setFormCourseId('')
    setFormYearLevel('')
    setIsGeneral(false)
    setFormStatus('draft')
    setFormPublishAt('')
    setFormExpiresAt('')
    setFormFiles([])
    setFormFilePreviews((prev) => { prev.forEach((u) => URL.revokeObjectURL(u)); return [] })
    setFormError('')
    setFormStep('form')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const openCreate = useCallback(() => {
    setEditingItem(null)
    resetForm()
    setFormOpen(true)
  }, [resetForm])

  const openEdit = useCallback((item: AnnouncementRow) => {
    setEditingItem(item)
    setFormTitle(item.title)
    setFormContent(item.content)
    setFormCourseId(item.course?.id ?? '')
    setFormYearLevel(item.targetYearLevel ? String(item.targetYearLevel) : '')
    setIsGeneral(item.isGeneral)
    setFormStatus(item.status)
    setFormPublishAt(item.publishAt ? item.publishAt.split('T')[0] : '')
    setFormExpiresAt(item.expiresAt ? item.expiresAt.split('T')[0] : '')
    setFormFiles([])
    setFormError('')
    setFormStep('form')
    if (fileInputRef.current) fileInputRef.current.value = ''
    setFormOpen(true)
  }, [])

  const closeForm = useCallback(() => {
    setFormOpen(false)
    setEditingItem(null)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    setFormFiles((prev) => [...prev, ...files])
    setFormFilePreviews((prev) => [
      ...prev,
      ...files.map((f) => f.type.startsWith('image/') ? URL.createObjectURL(f) : ''),
    ])
  }, [])

  const removeFile = useCallback((index: number) => {
    setFormFiles((prev) => prev.filter((_, i) => i !== index))
    setFormFilePreviews((prev) => {
      URL.revokeObjectURL(prev[index])
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  const handleFormSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setFormStep('preview')
  }, [])

  const handleBackToForm = useCallback(() => {
    setFormError('')
    setFormStep('form')
  }, [])

  const handleConfirmSubmit = useCallback(async () => {
    setFormSubmitting(true)
    setFormError('')
    try {
      const body = new FormData()
      body.append('title', formTitle)
      body.append('content', formContent)
      if (formCourseId) body.append('courseId', formCourseId)
      if (formYearLevel) body.append('targetYearLevel', formYearLevel)
      body.append('isGeneral', String(formIsGeneral))
      body.append('status', formStatus)
      if (formPublishAt) body.append('publishAt', formPublishAt)
      if (formExpiresAt) body.append('expiresAt', formExpiresAt)
      for (const file of formFiles) {
        body.append('attachments', file)
      }

      if (editingItem) {
        await apiClient(`/announcements/${editingItem.id}`, { method: 'PUT', body, authenticated: true })
        toast({ message: 'Announcement updated', variant: 'success' })
      } else {
        await apiClient('/announcements', { method: 'POST', body, authenticated: true })
        toast({ message: 'Announcement created', variant: 'success' })
      }
      closeForm()
      setPage(1)
      fetchData()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'An error occurred')
    } finally {
      setFormSubmitting(false)
    }
  }, [formTitle, formContent, formCourseId, formYearLevel, formIsGeneral, formStatus, formPublishAt, formExpiresAt, formFiles, editingItem, toast, closeForm, fetchData])

  const handleArchive = useCallback(async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await apiClient(`/announcements/${deleteTarget.id}/archive`, { method: 'PATCH', authenticated: true })
      toast({ message: 'Announcement archived', variant: 'success' })
      setDeleteTarget(null)
      fetchData()
    } catch (err) {
      toast({ message: err instanceof ApiError ? err.message : 'Failed to archive', variant: 'error' })
    } finally {
      setDeleting(false)
    }
  }, [deleteTarget, toast, fetchData])

  const handleHardDelete = useCallback(async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await apiClient(`/announcements/${deleteTarget.id}`, { method: 'DELETE', authenticated: true })
      toast({ message: 'Announcement permanently deleted', variant: 'success' })
      setDeleteTarget(null)
      fetchData()
    } catch (err) {
      toast({ message: err instanceof ApiError ? err.message : 'Failed to delete', variant: 'error' })
    } finally {
      setDeleting(false)
    }
  }, [deleteTarget, toast, fetchData])

  const handlePdfFullscreen = useCallback(async (fileUrl: string, title: string, mimeType?: string) => {
    try {
      const result = await apiClient<{ signedUrl: string }>(`/announcements/attachments/${encodeURIComponent(fileUrl)}`, { authenticated: true })
      if (result.signedUrl) setFullscreenViewer({ url: result.signedUrl, title, mimeType })
    } catch {
      toast({ message: 'Failed to load preview', variant: 'error' })
    }
  }, [toast])

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const columns: Column<AnnouncementRow>[] = useMemo(() => [
    { key: 'title', header: 'Title', sortable: true },
    {
      key: 'course',
      header: 'Course',
      render: (row) =>
        row.isGeneral ? <Badge variant="brand">General</Badge>
          : row.course ? <Badge variant="neutral">{row.course.code}</Badge>
          : <span className={styles.muted}>—</span>,
    },
    {
      key: 'targetYearLevel',
      header: 'Scope',
      render: (row) => <span>{row.targetYearLevel ? `Year ${row.targetYearLevel}` : 'All Years'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => <Badge variant={STATUS_BADGE[row.status] ?? 'neutral'}>{row.status.charAt(0).toUpperCase() + row.status.slice(1)}</Badge>,
    },
    {
      key: 'attachments',
      header: 'Files',
      render: (row) => (
        <span className={styles.muted}>
          {row.attachments.length > 0 ? `${row.attachments.length} file${row.attachments.length > 1 ? 's' : ''}` : '—'}
        </span>
      ),
    },
    {
      key: 'faculty',
      header: 'Author',
      render: (row) => row.faculty.fullName,
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (row) => formatDate(row.createdAt),
    },
    {
      key: 'actions',
      header: '',
      width: '180px',
      render: (row) => (
        <div className={styles.actionBtns}>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setDetailRecord(row) }}>View</Button>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(row) }}>Edit</Button>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setDeleteTarget(row) }}>Archive</Button>
        </div>
      ),
    },
  ], [openEdit])

  const formValid = formTitle.trim() && formContent.trim()

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Announcements</h1>
        <Button variant="primary" size="sm" onClick={openCreate}>New Announcement</Button>
      </div>

      <div className={styles.toolbar}>
        <SearchBar value={searchQuery} onChange={handleSearch} placeholder="Search by title..." className={styles.search} />
        <Select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}
          options={STATUS_OPTIONS}
          placeholder="All Statuses"
          className={styles.filterSelect}
        />
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
        emptyState={<span>No announcements found.</span>}
        pagination={{ page, pageCount, onPageChange: setPage }}
      />

      {/* Create / Edit Dialog */}
      <Dialog
        open={formOpen}
        onClose={closeForm}
        title={editingItem ? 'Edit Announcement' : 'New Announcement'}
        fullscreen={formStep === 'form'}
        bodyClassName={styles.formScrollContainer}
        footer={
          formStep === 'preview' ? (
            <div className={styles.dialogFooter}>
              <Button variant="outline" onClick={handleBackToForm}>Back / Edit</Button>
              <Button onClick={handleConfirmSubmit} disabled={formSubmitting}>
                {formSubmitting ? 'Saving...' : editingItem ? 'Confirm & Save' : 'Confirm & Publish'}
              </Button>
            </div>
          ) : (
            <div className={styles.dialogFooter}>
              <Button variant="outline" onClick={closeForm}>Cancel</Button>
              <Button onClick={handleFormSubmit} disabled={!formValid}>Review</Button>
            </div>
          )
        }
      >
        <div style={{ position: 'relative', minHeight: 200 }}>
          <LoadingOverlay visible={formSubmitting} message={editingItem ? 'Updating announcement...' : 'Creating announcement...'}>
            {formStep === 'preview' ? (
              <div className={styles.previewWrapper}>
            {formError && <div className={styles.formError}>{formError}</div>}

            <div className={styles.previewHeader}>
              <div className={styles.previewTitleBlock}>
                <Badge variant={STATUS_BADGE[formStatus] ?? 'neutral'}>{formStatus.charAt(0).toUpperCase() + formStatus.slice(1)}</Badge>
                <h2 className={styles.previewTitle}>{formTitle || 'Untitled'}</h2>
              </div>
            </div>

            <div className={styles.previewMetaCard}>
              <div className={styles.previewMetaGrid}>
                <div className={styles.previewMetaItem}>
                  <span className={styles.previewMetaLabel}>Audience</span>
                  <span className={styles.previewMetaValue}>
                    {formIsGeneral ? 'All Users'
                      : formCourseId
                        ? (() => {
                            const c = courseOptions.find((o) => o.value === formCourseId)
                            return c ? c.label : '—'
                          })()
                        : 'All Courses'}
                  </span>
                </div>
                <div className={styles.previewMetaItem}>
                  <span className={styles.previewMetaLabel}>Year Level</span>
                  <span className={styles.previewMetaValue}>{formYearLevel ? `Year ${formYearLevel}` : 'All Years'}</span>
                </div>
                {formPublishAt && (
                  <div className={styles.previewMetaItem}>
                    <span className={styles.previewMetaLabel}>Publish Date</span>
                    <span className={styles.previewMetaValue}>{new Date(formPublishAt).toLocaleDateString()}</span>
                  </div>
                )}
                {formExpiresAt && (
                  <div className={styles.previewMetaItem}>
                    <span className={styles.previewMetaLabel}>Expiry Date</span>
                    <span className={styles.previewMetaValue}>{new Date(formExpiresAt).toLocaleDateString()}</span>
                  </div>
                )}
                <div className={styles.previewMetaItem}>
                  <span className={styles.previewMetaLabel}>Attachments</span>
                  <span className={styles.previewMetaValue}>{formFiles.length > 0 ? `${formFiles.length} file${formFiles.length > 1 ? 's' : ''}` : 'None'}</span>
                </div>
              </div>
            </div>

            {formFiles.length > 0 && (
              <div className={styles.previewSection}>
                <h3 className={styles.previewSectionTitle}>Attached Files</h3>
                {formFiles.some((_, i) => formFilePreviews[i]) && (
                  <div className={styles.previewImageGrid}>
                    {formFiles.map((f, i) =>
                      formFilePreviews[i] ? (
                        <div key={i} className={styles.previewImageItem}>
                          <img src={formFilePreviews[i]} alt={f.name} className={styles.previewImage} />
                          <span className={styles.previewImageName}>{f.name}</span>
                        </div>
                      ) : null
                    )}
                  </div>
                )}
                <div className={styles.previewChipList}>
                  {formFiles.map((f, i) => (
                    <span key={i} className={styles.previewChip}>
                      {formFilePreviews[i] ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                        </svg>
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                        </svg>
                      )}
                      {f.name}
                      <span className={styles.previewChipSize}>({formatFileSize(f.size)})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.previewSection}>
              <h3 className={styles.previewSectionTitle}>Content</h3>
              <div className={styles.previewContentCard}>
                <p className={styles.previewContentText}>{formContent}</p>
              </div>
            </div>
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleFormSubmit}>
            {formError && <div className={styles.formError}>{formError}</div>}

            <div className={styles.field}>
              <label className={styles.label}>Title *</label>
              <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Announcement title" required />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Content *</label>
              <textarea
                value={formContent}
                onChange={(e) => { setFormContent(e.target.value); autoGrow(e.target) }}
                onInput={(e) => autoGrow(e.currentTarget)}
                placeholder="Announcement content..."
                className={styles.textarea}
                rows={4}
                required
              />
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label}>Target Course</label>
                <Select
                  value={formCourseId}
                  onChange={(e) => setFormCourseId(e.target.value)}
                  options={[{ value: '', label: 'All Courses' }, ...courseOptions]}
                  placeholder="All Courses"
                  disabled={formIsGeneral}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Year Level</label>
                <Select
                  value={formYearLevel}
                  onChange={(e) => setFormYearLevel(e.target.value)}
                  options={YEAR_LEVELS}
                  placeholder="All Years"
                  disabled={formIsGeneral}
                />
              </div>
              <div className={styles.checkField}>
                <label className={styles.checkLabel}>
                  <input type="checkbox" checked={formIsGeneral} onChange={(e) => setIsGeneral(e.target.checked)} className={styles.checkbox} />
                  General (all users)
                </label>
              </div>
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label}>Status</label>
                <Select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  options={[
                    { value: 'draft', label: 'Draft' },
                    { value: 'published', label: 'Published' },
                  ]}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Publish At</label>
                <DatePicker value={formPublishAt} onChange={setFormPublishAt} placeholder="Immediate" />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Expires At</label>
                <DatePicker value={formExpiresAt} onChange={setFormExpiresAt} placeholder="No expiry" />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Attachments (optional, max 10MB each)</label>
              <div className={styles.fileUploadArea}>
                <button type="button" className={styles.fileUploadBtn} onClick={() => fileInputRef.current?.click()}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Choose Files
                </button>
                <span className={styles.fileCount}>{formFiles.length > 0 ? `${formFiles.length} file${formFiles.length > 1 ? 's' : ''} selected` : 'No files chosen'}</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className={styles.fileInputHidden}
                />
              </div>
              {formFiles.length > 0 && (
                <ul className={styles.fileList}>
                  {formFiles.map((f, i) => (
                    <li key={i} className={styles.fileItem}>
                      <span className={styles.fileItemInfo}>
                        {formFilePreviews[i] ? (
                          <img src={formFilePreviews[i]} alt={f.name} className={styles.fileItemThumb} />
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.fileItemIcon}>
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                          </svg>
                        )}
                        <span>{f.name}</span>
                        <span className={styles.fileItemSize}>({formatFileSize(f.size)})</span>
                      </span>
                      <button type="button" className={styles.removeFileBtn} onClick={() => removeFile(i)}>&times;</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </form>
        )}
          </LoadingOverlay>
        </div>

      </Dialog>

      {/* Detail Drawer */}
      <Dialog
        open={!!detailRecord}
        onClose={() => setDetailRecord(null)}
        title={
          <div className={styles.drawerHeader}>
            <span className={styles.drawerTitle}>{detailRecord?.title}</span>
            <Badge variant={STATUS_BADGE[detailRecord?.status ?? ''] ?? 'neutral'}>{detailRecord?.status ? detailRecord.status.charAt(0).toUpperCase() + detailRecord.status.slice(1) : ''}</Badge>
          </div>
        }
        position="right"
        bodyClassName={styles.detailBody}
        footer={
          <div className={styles.dialogFooter}>
            <Button variant="ghost" onClick={() => { setDetailRecord(null) }}>Close</Button>
          </div>
        }
      >
        {detailRecord && (
          <div className={styles.detailContent}>
            {/* Details Card */}
            <div className={styles.drawerCard}>
              <div className={styles.drawerCardGrid}>
                <div className={styles.drawerField}>
                  <span className={styles.drawerFieldLabel}>Author</span>
                  <span className={styles.drawerFieldValue}>{detailRecord.faculty.fullName}</span>
                </div>
                <div className={styles.drawerField}>
                  <span className={styles.drawerFieldLabel}>Course</span>
                  <span className={styles.drawerFieldValue}>
                    {detailRecord.isGeneral ? <Badge variant="brand">General</Badge>
                      : detailRecord.course ? <Badge variant="neutral">{detailRecord.course.code}</Badge>
                      : '—'}
                  </span>
                </div>
                <div className={styles.drawerField}>
                  <span className={styles.drawerFieldLabel}>Year Level</span>
                  <span className={styles.drawerFieldValue}>{detailRecord.targetYearLevel ? `Year ${detailRecord.targetYearLevel}` : 'All Years'}</span>
                </div>
                <div className={styles.drawerField}>
                  <span className={styles.drawerFieldLabel}>Created</span>
                  <span className={styles.drawerFieldValue}>{formatDate(detailRecord.createdAt)}</span>
                </div>
                <div className={styles.drawerField}>
                  <span className={styles.drawerFieldLabel}>Publish At</span>
                  <span className={styles.drawerFieldValue}>{detailRecord.publishAt ? formatDate(detailRecord.publishAt) : 'Immediate'}</span>
                </div>
                <div className={styles.drawerField}>
                  <span className={styles.drawerFieldLabel}>Expires At</span>
                  <span className={styles.drawerFieldValue}>{detailRecord.expiresAt ? formatDate(detailRecord.expiresAt) : 'Never'}</span>
                </div>
                <div className={styles.drawerField}>
                  <span className={styles.drawerFieldLabel}>Updated</span>
                  <span className={styles.drawerFieldValue}>{formatDate(detailRecord.updatedAt)}</span>
                </div>
                <div className={styles.drawerField}>
                  <span className={styles.drawerFieldLabel}>Reads</span>
                  <span className={styles.drawerFieldValue}>{detailRecord._count.reads}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            {detailRecord.content && (
              <div className={styles.drawerSection}>
                <h3 className={styles.drawerSectionTitle}>Description</h3>
                <p className={styles.drawerSectionText}>{detailRecord.content}</p>
              </div>
            )}

            {/* Attachments */}
            {detailRecord.attachments.length > 0 && (
              <div className={styles.drawerSection}>
                <h3 className={styles.drawerSectionTitle}>Attachments ({detailRecord.attachments.length})</h3>
                <div className={styles.attachmentGrid}>
                  {detailRecord.attachments.map((att) => (
                    <AttachmentPreview key={att.id} attachment={att} onPdfFullscreen={handlePdfFullscreen} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Dialog>

      {/* Fullscreen Viewer */}
      <Dialog
        open={!!fullscreenViewer}
        onClose={() => setFullscreenViewer(null)}
        title={fullscreenViewer?.title || 'Preview'}
        fullscreen
      >
        {fullscreenViewer && (
          fullscreenViewer.mimeType?.startsWith('image/') ? (
            <img src={fullscreenViewer.url} alt={fullscreenViewer.title} className={styles.fullscreenImage} />
          ) : (
            <iframe src={fullscreenViewer.url} className={styles.fullscreenPdf} title={fullscreenViewer.title} />
          )
        )}
      </Dialog>

      {/* Archive Confirm Dialog */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={deleteTarget?.status === 'archived' ? 'Permanently Delete' : 'Archive Announcement'}
        footer={
          <div className={styles.dialogFooter}>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            {deleteTarget?.status === 'archived' ? (
              <Button variant="destructive" onClick={handleHardDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete Permanently'}
              </Button>
            ) : (
              <Button variant="destructive" onClick={handleArchive} disabled={deleting}>
                {deleting ? 'Archiving...' : 'Archive'}
              </Button>
            )}
          </div>
        }
      >
        {deleteTarget?.status === 'archived' ? (
          <p>This announcement is already archived. Permanently delete it? This cannot be undone.</p>
        ) : (
          <p>Archive &ldquo;{deleteTarget?.title}&rdquo;? It will be hidden from students but remain visible to admins.</p>
        )}
      </Dialog>
    </div>
  )
}
