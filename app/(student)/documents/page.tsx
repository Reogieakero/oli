'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '@/lib/apiClient'
import { Badge } from '@/components/ui/Badge/Badge'
import { Spinner } from '@/components/ui/Spinner/Spinner'
import styles from './page.module.css'

interface DocumentItem {
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

const CATEGORY_BADGE: Record<string, 'neutral' | 'brand' | 'success' | 'warning' | 'danger'> = {
  Certificate: 'success',
  Form: 'brand',
  Policy: 'warning',
  Report: 'neutral',
  Other: 'neutral',
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatRelative(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'AD'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  const [viewing, setViewing] = useState<DocumentItem | null>(null)
  const [viewUrl, setViewUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await apiClient<{ data: DocumentItem[] }>(
          '/audit-files?limit=50&sortBy=createdAt&sortOrder=desc',
          { authenticated: true }
        )
        if (cancelled) return
        const items = res.data || []
        setDocs(items)

        const urls: Record<string, string> = {}
        const imageDocs = items.filter((d) => d.mimeType.startsWith('image/'))
        await Promise.all(
          imageDocs.map(async (d) => {
            try {
              const r = await apiClient<{ signedUrl: string }>(
                `/audit-files/download/${encodeURIComponent(d.fileUrl)}`,
                { authenticated: true }
              )
              urls[d.id] = r.signedUrl
            } catch {
              /* skip image preview */
            }
          })
        )
        if (!cancelled) setSignedUrls(urls)
      } catch {
        /* handled below */
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setViewing(null)
        setViewUrl(null)
      }
    }
    if (viewing) {
      window.addEventListener('keydown', onKey)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [viewing])

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return docs
    return docs.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        (d.description ?? '').toLowerCase().includes(q) ||
        (d.category ?? '').toLowerCase().includes(q) ||
        (d.course?.name ?? '').toLowerCase().includes(q) ||
        (d.faculty?.fullName ?? '').toLowerCase().includes(q)
    )
  }, [docs, query])

  const openViewer = async (d: DocumentItem) => {
    setViewing(d)
    setViewUrl(null)
    const cached = signedUrls[d.id]
    if (cached) {
      setViewUrl(cached)
      return
    }
    try {
      const r = await apiClient<{ signedUrl: string }>(
        `/audit-files/download/${encodeURIComponent(d.fileUrl)}`,
        { authenticated: true }
      )
      setSignedUrls((prev) => ({ ...prev, [d.id]: r.signedUrl }))
      setViewUrl(r.signedUrl)
    } catch {
      setViewUrl(null)
    }
  }

  const closeViewer = () => {
    setViewing(null)
    setViewUrl(null)
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <h1 className={styles.title}>Documents</h1>
        <div className={styles.search}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-muted-fg)', flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            className={styles.searchInput}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents..."
          />
        </div>
      </div>

      {loading ? (
        <Spinner style={{ padding: 40 }} />
      ) : filtered.length === 0 ? (
        <div className={styles.emptyState}>
          {query ? 'No documents match your search.' : 'No documents posted yet. Check back later.'}
        </div>
      ) : (
        <div className={styles.feed}>
          {filtered.map((d) => {
            const isImage = d.mimeType.startsWith('image/')
            const previewUrl = signedUrls[d.id]
            return (
              <article key={d.id} className={styles.post}>
                {/* Header */}
                <header className={styles.postHeader}>
                  <div className={styles.avatar}>{initials(d.faculty?.fullName || 'Admin')}</div>
                  <div className={styles.postUser}>
                    <div className={styles.userName}>{d.faculty?.fullName || 'Admin'}</div>
                    <div className={styles.postTime}>{formatRelative(d.createdAt)}</div>
                  </div>
                </header>

                {/* Media */}
                <div className={styles.postMedia}>
                  {isImage && previewUrl ? (
                    <img src={previewUrl} alt={d.title} className={styles.postImage} />
                  ) : isImage ? (
                    <div className={styles.fileHero}>
                      <div className={styles.fileIcon}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <path d="M21 15l-5-5L6 20" />
                        </svg>
                      </div>
                      <span className={styles.fileName}>{d.fileName}</span>
                    </div>
                  ) : (
                    <div className={styles.fileHero}>
                      <div className={styles.fileIcon}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2Z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      </div>
                      <span className={styles.fileName}>{d.fileName}</span>
                      <span className={styles.fileSub}>
                        {d.mimeType === 'application/pdf' ? 'PDF' : d.mimeType.split('/')[1]?.toUpperCase() || 'File'} · {formatFileSize(d.fileSize)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className={styles.postBody}>
                  <p className={styles.postTitle}>{d.title}</p>
                  {d.description && <p className={styles.postDesc}>{d.description}</p>}
                  <div className={styles.metaRow}>
                    {d.category ? (
                      <Badge variant={CATEGORY_BADGE[d.category] ?? 'neutral'}>{d.category}</Badge>
                    ) : null}
                    {d.course ? <Badge variant="brand">{d.course.code}</Badge> : null}
                    <span className={styles.metaFile} title={d.fileName}>
                      {formatFileSize(d.fileSize)} · {d.fileName}
                    </span>
                  </div>
                  <button className={styles.viewBtn} type="button" onClick={() => openViewer(d)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    View document
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {viewing && (
        <div className={styles.viewerBackdrop} onClick={closeViewer}>
          <div className={styles.viewer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.viewerHeader}>
              <div className={styles.viewerTitleWrap}>
                <span className={styles.viewerTitle}>{viewing.title}</span>
                <span className={styles.viewerSub}>{viewing.fileName}</span>
              </div>
              <button className={styles.viewerClose} type="button" onClick={closeViewer} aria-label="Close">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className={styles.viewerBody}>
              {viewUrl === null ? (
                <div className={styles.viewerLoading}>
                  <Spinner />
                </div>
              ) : viewing.mimeType.startsWith('image/') ? (
                <img src={viewUrl} alt={viewing.title} className={styles.viewerImage} />
              ) : viewing.mimeType === 'application/pdf' ? (
                <iframe className={styles.viewerFrame} src={viewUrl} title={viewing.title} />
              ) : (
                <div className={styles.viewerFallback}>
                  <div className={styles.fileIcon}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2Z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <p className={styles.fallbackText}>
                    This file type can&apos;t be previewed in the browser.
                  </p>
                  <a
                    className={styles.viewBtn}
                    href={viewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open in new tab
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
