'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { apiClient, ApiError } from '@/lib/apiClient'
import { Button } from '@/components/ui/Button/Button'
import { Badge } from '@/components/ui/Badge/Badge'
import { SearchBar } from '@/components/ui/SearchBar/SearchBar'
import { DatePicker } from '@/components/ui/DatePicker/DatePicker'
import { Select, type SelectOption } from '@/components/ui/Select/Select'
import { Input } from '@/components/ui/Input/Input'
import { DataTable, type Column } from '@/components/ui/DataTable/DataTable'
import { Dialog } from '@/components/ui/Dialog/Dialog'
import { LoadingOverlay } from '@/components/ui/LoadingOverlay/LoadingOverlay'
import { useToast } from '@/components/ui/Toast/Toast'
import styles from './page.module.css'

type FormStep = 'form' | 'preview'

interface DocumentRow {
  id: string
  title: string
  description: string | null
  category: string | null
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
  createdAt: string
  faculty: { fullName: string }
  course: { id: string; code: string; name: string } | null
}

interface CourseOption {
  id: string
  code: string
  name: string
}

const CATEGORY_OPTIONS: SelectOption[] = [
  { value: '', label: 'All Categories' },
  { value: 'Certificate', label: 'Certificate' },
  { value: 'Form', label: 'Form' },
  { value: 'Policy', label: 'Policy' },
  { value: 'Report', label: 'Report' },
  { value: 'Other', label: 'Other' },
]

const CATEGORY_BADGE: Record<string, 'neutral' | 'brand' | 'success' | 'warning' | 'danger'> = {
  Certificate: 'success',
  Form: 'brand',
  Policy: 'warning',
  Report: 'neutral',
  Other: 'neutral',
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString()
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType === 'application/pdf') return 'pdf'
  if (mimeType.includes('word') || mimeType.includes('document')) return 'doc'
  if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType.includes('csv')) return 'sheet'
  return 'file'
}

export default function AdminDocumentsPage() {
  const { toast } = useToast()

  const [data, setData] = useState<DocumentRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterCourse, setFilterCourse] = useState('')
  const [filterFromDate, setFilterFromDate] = useState('')
  const [filterToDate, setFilterToDate] = useState('')
  const [sortBy, setSortBy] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [courseOptions, setCourseOptions] = useState<SelectOption[]>([])
  const [courseMap, setCourseMap] = useState<Map<string, CourseOption>>(new Map())

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [formStep, setFormStep] = useState<FormStep>('form')
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formCategory, setFormCategory] = useState('')
  const [formCourseId, setFormCourseId] = useState('')
  const [formFile, setFormFile] = useState<File | null>(null)
  const [formFilePreview, setFormFilePreview] = useState('')
  const [formError, setFormError] = useState('')
  const [formSubmitting, setFormSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [detailRecord, setDetailRecord] = useState<DocumentRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DocumentRow | null>(null)
  const [fullscreenViewer, setFullscreenViewer] = useState<{ url: string; title: string; mimeType?: string } | null>(null)

  const limit = 20

  useEffect(() => {
    apiClient<{ data: CourseOption[] }>('/courses?limit=1000', { authenticated: true })
      .then((res) => {
        const options: SelectOption[] = (res.data || []).map((c) => ({ value: c.id, label: c.name }))
        setCourseOptions(options)
        const map = new Map<string, CourseOption>()
        for (const c of res.data || []) map.set(c.id, c)
        setCourseMap(map)
      })
      .catch(() => {})
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(limit))
      if (searchQuery) params.set('search', searchQuery)
      if (filterCategory) params.set('category', filterCategory)
      if (filterCourse) params.set('courseId', filterCourse)
      if (filterFromDate) params.set('startDate', filterFromDate)
      if (filterToDate) params.set('endDate', filterToDate)
      if (sortBy) { params.set('sortBy', sortBy); params.set('sortOrder', sortOrder) }

      const result = await apiClient<{ data: DocumentRow[]; total: number; page: number; limit: number }>(`/audit-files?${params.toString()}`, { authenticated: true })
      setData(result.data)
      setTotal(result.total)
    } catch {
      toast({ message: 'Failed to load documents', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }, [page, searchQuery, filterCategory, filterCourse, filterFromDate, filterToDate, sortBy, sortOrder, toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => setPage(1), 250)
  }, [])

  const handleSortChange = useCallback((sort: { key: string; direction: 'asc' | 'desc' } | null) => {
    if (sort) {
      setSortBy(sort.key)
      setSortOrder(sort.direction)
    } else {
      setSortBy('')
      setSortOrder('asc')
    }
    setPage(1)
  }, [])

  const pageCount = Math.max(1, Math.ceil(total / limit))

  const openUpload = useCallback(() => {
    setFormTitle('')
    setFormDescription('')
    setFormCategory('')
    setFormCourseId('')
    setFormFile(null)
    setFormFilePreview('')
    setFormError('')
    setFormStep('form')
    if (fileInputRef.current) fileInputRef.current.value = ''
    setFormOpen(true)
  }, [])

  const closeForm = useCallback(() => {
    setFormOpen(false)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setFormFile(file)
    if (formFilePreview) URL.revokeObjectURL(formFilePreview)
    setFormFilePreview(file ? URL.createObjectURL(file) : '')
  }, [formFilePreview])

  const handleFormSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setFormStep('preview')
  }, [])

  const handleBackToForm = useCallback(() => {
    setFormError('')
    setFormStep('form')
  }, [])

  const handleConfirmSubmit = useCallback(async () => {
    if (!formFile) return
    setFormSubmitting(true)
    setFormError('')
    try {
      const body = new FormData()
      body.append('title', formTitle)
      if (formDescription) body.append('description', formDescription)
      if (formCategory) body.append('category', formCategory)
      if (formCourseId) body.append('courseId', formCourseId)
      body.append('file', formFile)

      await apiClient('/audit-files', { method: 'POST', body, authenticated: true })
      toast({ message: 'Document uploaded', variant: 'success' })
      closeForm()
      setPage(1)
      fetchData()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'An error occurred')
    } finally {
      setFormSubmitting(false)
    }
  }, [formTitle, formDescription, formCategory, formCourseId, formFile, toast, closeForm, fetchData])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await apiClient(`/audit-files/${deleteTarget.id}`, { method: 'DELETE', authenticated: true })
      toast({ message: 'Document deleted', variant: 'success' })
      setDeleteTarget(null)
      if (detailRecord?.id === deleteTarget.id) setDetailRecord(null)
      fetchData()
    } catch {
      toast({ message: 'Failed to delete document', variant: 'error' })
    }
  }, [deleteTarget, detailRecord, toast, fetchData])

  const handlePdfFullscreen = useCallback(async (fileUrl: string, title: string, mimeType?: string) => {
    try {
      const result = await apiClient<{ signedUrl: string }>(`/audit-files/download/${encodeURIComponent(fileUrl)}`, { authenticated: true })
      if (result.signedUrl) setFullscreenViewer({ url: result.signedUrl, title, mimeType })
    } catch {
      toast({ message: 'Failed to load preview', variant: 'error' })
    }
  }, [toast])

  const formValid = formTitle.trim() && formFile

  const columns: Column<DocumentRow>[] = [
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      render: (row) => <span className={styles.titleCell}>{row.title}</span>,
    },
    {
      key: 'category',
      header: 'Type',
      width: '120px',
      render: (row) =>
        row.category ? <Badge variant={CATEGORY_BADGE[row.category] ?? 'neutral'}>{row.category}</Badge> : <span className={styles.muted}>—</span>,
    },
    {
      key: 'course',
      header: 'Course',
      width: '130px',
      render: (row) =>
        row.course ? <Badge variant="brand">{row.course.code}</Badge> : <span className={styles.muted}>—</span>,
    },
    {
      key: 'fileSize',
      header: 'Size',
      width: '80px',
      render: (row) => <span className={styles.muted}>{formatFileSize(row.fileSize)}</span>,
    },
    {
      key: 'faculty',
      header: 'Uploaded By',
      width: '130px',
      render: (row) => <span>{row.faculty.fullName}</span>,
    },
    {
      key: 'createdAt',
      header: 'Date',
      width: '100px',
      sortable: true,
      render: (row) => <span className={styles.muted}>{formatDate(row.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      width: '100px',
      render: (row) => (
        <div className={styles.actionBtns}>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setDeleteTarget(row) }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Documents</h1>
        <Button variant="primary" size="sm" onClick={openUpload}>Upload Document</Button>
      </div>

      <div className={styles.toolbar}>
        <SearchBar value={searchQuery} onChange={handleSearch} placeholder="Search by title..." className={styles.search} />
        <Select
          value={filterCategory}
          onChange={(e) => { setFilterCategory(e.target.value); setPage(1) }}
          options={CATEGORY_OPTIONS}
          placeholder="All Categories"
          className={styles.filterSelect}
        />
        <Select
          value={filterCourse}
          onChange={(e) => { setFilterCourse(e.target.value); setPage(1) }}
          options={[{ value: '', label: 'All Courses' }, ...courseOptions]}
          placeholder="All Courses"
          className={styles.filterSelect}
        />
        <DatePicker value={filterFromDate} onChange={(v) => { setFilterFromDate(v); setPage(1) }} placeholder="From date" className={styles.filterDate} />
        <DatePicker value={filterToDate} onChange={(v) => { setFilterToDate(v); setPage(1) }} placeholder="To date" className={styles.filterDate} />
      </div>

      <DataTable
        columns={columns}
        data={data}
        getRowId={(r) => r.id}
        loading={loading}
        sortState={sortBy ? { key: sortBy, direction: sortOrder } : null}
        onSortChange={handleSortChange}
        emptyState={<div className={styles.empty}>No documents found. Upload your first document.</div>}
        pagination={data.length > 0 ? { page, pageCount, onPageChange: setPage } : undefined}
        onRowClick={(r) => setDetailRecord(r)}
      />

      {/* Upload Dialog */}
      <Dialog
        open={formOpen}
        onClose={closeForm}
        title="Upload Document"
        fullscreen={false}
        bodyClassName={styles.formScrollContainer}
        footer={
          formStep === 'preview' ? (
            <div className={styles.dialogFooter}>
              <Button variant="outline" onClick={handleBackToForm}>Back / Edit</Button>
              <Button onClick={handleConfirmSubmit} disabled={formSubmitting}>
                {formSubmitting ? 'Uploading...' : 'Confirm & Upload'}
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
          <LoadingOverlay visible={formSubmitting} message="Uploading document...">
            {formStep === 'preview' ? (
              <div className={styles.previewWrapper}>
                {formError && <div className={styles.formError}>{formError}</div>}

                <div className={styles.previewHeader}>
                  <h2 className={styles.previewTitle}>{formTitle}</h2>
                </div>

                <div className={styles.previewMetaCard}>
                  <div className={styles.previewMetaGrid}>
                    {formCategory && (
                      <div className={styles.previewMetaItem}>
                        <span className={styles.previewMetaLabel}>Category</span>
                        <span className={styles.previewMetaValue}><Badge variant={CATEGORY_BADGE[formCategory] ?? 'neutral'}>{formCategory}</Badge></span>
                      </div>
                    )}
                    {formCourseId ? (
                      <div className={styles.previewMetaItem}>
                        <span className={styles.previewMetaLabel}>Course</span>
                        <span className={styles.previewMetaValue}><Badge variant="brand">{courseMap.get(formCourseId)?.code || formCourseId}</Badge></span>
                      </div>
                    ) : null}
                    {formFile && (
                      <div className={styles.previewMetaItem}>
                        <span className={styles.previewMetaLabel}>File</span>
                        <span className={styles.previewMetaValue}>{formFile.name} ({formatFileSize(formFile.size)})</span>
                      </div>
                    )}
                  </div>
                </div>

                {formFile && (
                  <div className={styles.previewSection}>
                    <h3 className={styles.previewSectionTitle}>Preview</h3>
                    {formFile.type.startsWith('image/') && formFilePreview ? (
                      <img src={formFilePreview} alt={formFile.name} className={styles.previewImage} />
                    ) : (
                      <div className={styles.previewFileIcon}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2Z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                        <span>{formFile.name}</span>
                      </div>
                    )}
                  </div>
                )}

                {formDescription && (
                  <div className={styles.previewSection}>
                    <h3 className={styles.previewSectionTitle}>Description</h3>
                    <div className={styles.previewContentCard}>
                      <p className={styles.previewContentText}>{formDescription}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <form className={styles.form} onSubmit={handleFormSubmit}>
                {formError && <div className={styles.formError}>{formError}</div>}

                <div className={styles.field}>
                  <label className={styles.label}>Title *</label>
                  <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Document title" required />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Description (optional)</label>
                  <textarea className={styles.textarea} value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Brief description of the document" rows={3} />
                </div>

                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label className={styles.label}>Category (optional)</label>
                    <Select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      options={CATEGORY_OPTIONS.slice(1)}
                      placeholder="Select category"
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Course (optional)</label>
                    <Select
                      value={formCourseId}
                      onChange={(e) => setFormCourseId(e.target.value)}
                      options={[{ value: '', label: 'None' }, ...courseOptions]}
                      placeholder="No course"
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>File * (max 20MB)</label>
                  <div className={styles.fileUploadArea}>
                    <button type="button" className={styles.fileUploadBtn} onClick={() => fileInputRef.current?.click()}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      Choose File
                    </button>
                    <span className={styles.fileCount}>{formFile ? formFile.name : 'No file chosen'}</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileSelect}
                      className={styles.fileInputHidden}
                    />
                  </div>
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
          <div className={styles.drawerTitleWrap}>
            <span className={styles.drawerTitle}>{detailRecord?.title || ''}</span>
            {detailRecord?.category && <Badge variant={CATEGORY_BADGE[detailRecord.category] ?? 'neutral'}>{detailRecord.category}</Badge>}
          </div>
        }
        position="right"
        bodyClassName={styles.detailBody}
        footer={
          <div className={styles.drawerFooter}>
            <Button variant="ghost" onClick={() => setDetailRecord(null)}>Close</Button>
          </div>
        }
      >
        {detailRecord && (
          <div className={styles.detailContent}>
            {/* Hero Preview */}
            <div className={styles.drawerHero}>
              <div className={styles.drawerFileHero}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  {detailRecord.mimeType === 'application/pdf' ? (
                    <>
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2Z" />
                      <polyline points="14 2 14 8 20 8" />
                    </>
                  ) : (
                    <>
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2Z" />
                      <polyline points="14 2 14 8 20 8" />
                    </>
                  )}
                </svg>
                <span className={styles.drawerFileName}>{detailRecord.fileName}</span>
                {(detailRecord.mimeType.startsWith('image/') || detailRecord.mimeType === 'application/pdf') && (
                  <button
                    className={styles.drawerEyeBtn}
                    onClick={() => handlePdfFullscreen(detailRecord.fileUrl, detailRecord.title, detailRecord.mimeType)}
                    title="View full screen"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Details Card */}
            <div className={styles.drawerCard}>
              <div className={styles.drawerCardGrid}>
                <div className={styles.drawerField}>
                  <span className={styles.drawerFieldLabel}>Uploaded By</span>
                  <span className={styles.drawerFieldValue}>{detailRecord.faculty.fullName}</span>
                </div>
                <div className={styles.drawerField}>
                  <span className={styles.drawerFieldLabel}>Date</span>
                  <span className={styles.drawerFieldValue}>{formatDate(detailRecord.createdAt)}</span>
                </div>
                <div className={styles.drawerField}>
                  <span className={styles.drawerFieldLabel}>File Name</span>
                  <span className={styles.drawerFieldValue}>{detailRecord.fileName}</span>
                </div>
                <div className={styles.drawerField}>
                  <span className={styles.drawerFieldLabel}>Size</span>
                  <span className={styles.drawerFieldValue}>{formatFileSize(detailRecord.fileSize)}</span>
                </div>
                <div className={styles.drawerField}>
                  <span className={styles.drawerFieldLabel}>Type</span>
                  <span className={styles.drawerFieldValue}>{detailRecord.mimeType}</span>
                </div>
                <div className={styles.drawerField}>
                  <span className={styles.drawerFieldLabel}>Course</span>
                  <span className={styles.drawerFieldValue}>
                    {detailRecord.course ? <Badge variant="brand">{detailRecord.course.name}</Badge> : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            {detailRecord.description && (
              <div className={styles.drawerSection}>
                <h3 className={styles.drawerSectionTitle}>Description</h3>
                <p className={styles.drawerSectionText}>{detailRecord.description}</p>
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

      {/* Delete Confirmation */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Document"
        footer={
          <div className={styles.dialogFooter}>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </div>
        }
      >
        <p className={styles.deleteMessage}>Are you sure you want to delete <strong>{deleteTarget?.title}</strong>? This action cannot be undone.</p>
      </Dialog>
    </div>
  )
}
