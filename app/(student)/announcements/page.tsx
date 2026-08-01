'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiClient } from '@/lib/apiClient'
import { Card, CardBody } from '@/components/ui/Card/Card'
import { Badge } from '@/components/ui/Badge/Badge'
import { Spinner } from '@/components/ui/Spinner/Spinner'
import styles from './page.module.css'

interface AnnouncementItem {
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
  attachments: { id: string }[]
  _count: { reads: number }
}

function formatDateShort(d: string) {
  const datePart = d.includes('T') ? d.split('T')[0] : d
  const parts = datePart.split('-')
  if (parts.length !== 3) return { month: d, day: d }
  const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
  return {
    month: date.toLocaleDateString('en-US', { month: 'short' }),
    day: String(date.getDate()),
  }
}

function formatDate(d: string) {
  const datePart = d.includes('T') ? d.split('T')[0] : d
  const parts = datePart.split('-')
  if (parts.length !== 3) return d
  const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await apiClient<{ data: AnnouncementItem[]; total: number }>('/announcements?limit=100', { authenticated: true })
        setAnnouncements(res.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Announcements</h1>

      {loading ? (
        <Spinner style={{ padding: 40 }} />
      ) : announcements.length === 0 ? (
        <div className={styles.emptyState}>No announcements yet.</div>
      ) : (
        <div className={styles.cardGrid}>
          {announcements.map((ann) => {
            const { month, day } = formatDateShort(ann.publishAt || ann.createdAt)
            const target = ann.isGeneral
              ? { label: 'General', variant: 'neutral' as const }
              : { label: ann.course ? `${ann.course.code}${ann.targetYearLevel ? ` · Year ${ann.targetYearLevel}` : ''}` : 'Targeted', variant: 'brand' as const }
            return (
              <Card key={ann.id} style={ann.expiresAt && new Date(ann.expiresAt) < new Date() ? { opacity: 0.5 } : undefined}>
                <CardBody className={styles.cardBody}>
                  <div className={styles.dateBadge}>
                    <span className={styles.dateMonth}>{month}</span>
                    <span className={styles.dateDay}>{day}</span>
                  </div>
                  <div className={styles.cardContent}>
                    <div className={styles.cardHeader}>
                      <span className={styles.cardTitle}>{ann.title}</span>
                      <Badge variant={target.variant}>{target.label}</Badge>
                    </div>
                    <div className={styles.cardMeta}>
                      <span>by {ann.faculty?.fullName || 'Faculty'}</span>
                      <span>{formatDate(ann.publishAt || ann.createdAt)}</span>
                      {ann.attachments.length > 0 && (
                        <span>{ann.attachments.length} attachment{ann.attachments.length !== 1 ? 's' : ''}</span>
                      )}
                    </div>

                    <p className={styles.content}>
                      {ann.content}
                    </p>

                    <Link href={`/announcements/${ann.id}`} className={styles.readMore}>
                      Read more <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                    </Link>
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
