'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiClient } from '@/lib/apiClient'
import { Badge } from '@/components/ui/Badge/Badge'
import { Card, CardBody } from '@/components/ui/Card/Card'
import { Spinner } from '@/components/ui/Spinner/Spinner'
import styles from './page.module.css'

interface AnnouncementAttachment {
  id: string
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
}

interface AnnouncementDetail {
  id: string
  title: string
  content: string
  createdAt: string
  publishAt: string | null
  expiresAt: string | null
  isGeneral: boolean
  targetYearLevel: number | null
  course: { id: string; code: string; name: string } | null
  faculty: { fullName: string }
  attachments: AnnouncementAttachment[]
  _count: { reads: number }
}

function formatDateTime(d: string) {
  const date = new Date(d)
  if (isNaN(date.getTime())) return d
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function ChevronLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

export default function AnnouncementDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [ann, setAnn] = useState<AnnouncementDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [openingAttachment, setOpeningAttachment] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAnnouncement() {
      try {
        setError(null)
        const data = await apiClient<AnnouncementDetail>(`/announcements/${id}`, { authenticated: true })
        setAnn(data)
        await apiClient(`/announcements/${id}/read`, { method: 'POST', authenticated: true }).catch(() => {})
      } catch (err) {
        console.error(err)
        setError(err instanceof Error ? err.message : 'Failed to load announcement')
      } finally {
        setLoading(false)
      }
    }
    fetchAnnouncement()
  }, [id, retryCount])

  async function openAttachment(fileUrl: string) {
    setOpeningAttachment(fileUrl)
    try {
      const res = await apiClient<{ signedUrl: string }>(`/announcements/attachments/${encodeURIComponent(fileUrl)}`, { authenticated: true })
      if (res.signedUrl) window.open(res.signedUrl, '_blank', 'noopener,noreferrer')
    } catch (err) {
      console.error(err)
    } finally {
      setOpeningAttachment(null)
    }
  }

  if (loading) return <Spinner style={{ padding: 40 }} />
  if (error || !ann)
    return (
      <div className={styles.wrapper}>
        <button
          onClick={() => router.back()}
          className={styles.backBtn}
        >
          <ChevronLeft /> Back
        </button>
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-muted-fg)', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
          <div>{error || 'Announcement not found.'}</div>
          {error && (
            <button
              className={styles.retryBtn}
              onClick={() => {
                setLoading(true)
                setRetryCount((c) => c + 1)
              }}
            >
              Try again
            </button>
          )}
        </div>
      </div>
    )

  const target = ann.isGeneral
    ? { label: 'General', variant: 'neutral' as const }
    : { label: ann.course ? `${ann.course.code}${ann.targetYearLevel ? ` · Year ${ann.targetYearLevel}` : ''}` : 'Targeted', variant: 'brand' as const }

  const meta = [
    { label: 'Posted by', value: ann.faculty?.fullName || 'Faculty' },
    { label: 'Published', value: ann.publishAt ? formatDateTime(ann.publishAt) : formatDateTime(ann.createdAt) },
    { label: 'Target', value: target.label },
    ...(ann.expiresAt ? [{ label: 'Expires', value: formatDateTime(ann.expiresAt) }] : []),
  ]

  return (
    <div className={styles.wrapper}>
      <button
        onClick={() => router.back()}
        className={styles.backBtn}
      >
        <ChevronLeft /> Back
      </button>

      <Card>
        <CardBody style={{ padding: 0 }}>
          <div className={styles.header}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <h1 className={styles.title}>{ann.title}</h1>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <Badge variant={target.variant}>{target.label}</Badge>
                {ann.expiresAt && new Date(ann.expiresAt) < new Date() && <Badge variant="danger">Expired</Badge>}
              </div>
            </div>
          </div>

          <div className={styles.body}>
            <div className={styles.metaList}>
              {meta.map((m) => (
                <div key={m.label} className={styles.metaRow}>
                  <span className={styles.metaLabel}>{m.label}</span>
                  <span className={styles.metaValue}>{m.value}</span>
                </div>
              ))}
            </div>

            <div>
              <h3 className={styles.sectionLabel}>Content</h3>
              <p className={styles.content}>{ann.content}</p>
            </div>

            {ann.attachments.length > 0 && (
              <div>
                <h3 className={styles.sectionLabel}>Attachments ({ann.attachments.length})</h3>
                <div className={styles.attachments}>
                  {ann.attachments.map((att) => (
                    <button
                      key={att.id}
                      className={styles.attachmentBtn}
                      onClick={() => openAttachment(att.fileUrl)}
                      disabled={openingAttachment === att.fileUrl}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                      </svg>
                      <span className={styles.attachmentName}>{att.fileName}</span>
                      <span className={styles.attachmentSize}>{formatFileSize(att.fileSize)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
