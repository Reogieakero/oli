'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient, ApiError } from '@/lib/apiClient'
import { Badge } from '@/components/ui/Badge/Badge'
import { Select, type SelectOption } from '@/components/ui/Select/Select'
import { DataTable, type Column } from '@/components/ui/DataTable/DataTable'
import { Dialog } from '@/components/ui/Dialog/Dialog'
import { Button } from '@/components/ui/Button/Button'
import { useToast } from '@/components/ui/Toast/Toast'
import styles from './page.module.css'

const PAGE_SIZE = 20

interface FeedbackRow {
  id: string
  category: 'SYSTEM' | 'FACULTY'
  subject: string | null
  message: string
  isAnonymous: boolean
  response: string | null
  respondedAt: string | null
  createdAt: string
  user?: { email: string; student?: { firstName: string; lastName: string } | null }
}

interface FeedbackListResponse {
  data: FeedbackRow[]
  total: number
  page: number
  limit: number
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}

export default function AdminFeedbackPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [data, setData] = useState<FeedbackRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [filterCategory, setFilterCategory] = useState('')

  const [viewRecord, setViewRecord] = useState<FeedbackRow | null>(null)
  const [responseText, setResponseText] = useState('')
  const [responding, setResponding] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await apiClient<FeedbackListResponse>('/feedback', { authenticated: true })
      let rows = result.data
      if (filterCategory) {
        rows = rows.filter((r) => r.category.toLowerCase() === filterCategory.toLowerCase())
      }
      setData(rows)
      setTotal(result.total)
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 401) {
        router.replace('/admin-login')
      }
    } finally {
      setLoading(false)
    }
  }, [filterCategory, router])

  useEffect(() => { fetchData() }, [fetchData])

  const pageCount = Math.max(1, Math.ceil(data.length / PAGE_SIZE))

  const categoryOptions: SelectOption[] = [
    { value: '', label: 'All Categories' },
    { value: 'system', label: 'For the System' },
    { value: 'faculty', label: 'For the Faculty' },
  ]

  const columns: Column<FeedbackRow>[] = useMemo(() => [
    {
      key: 'category',
      header: 'Category',
      width: '120px',
      render: (row) => (
        <Badge variant={row.category === 'FACULTY' ? 'warning' : 'brand'}>
          {row.category === 'FACULTY' ? 'Faculty' : 'System'}
        </Badge>
      ),
    },
    {
      key: 'from',
      header: 'From',
      width: '160px',
      render: (row) =>
        row.isAnonymous ? (
          <Badge variant="neutral">Anonymous</Badge>
        ) : row.user?.student ? (
          <span>{row.user.student.lastName}, {row.user.student.firstName}</span>
        ) : (
          <span className={styles.muted}>{row.user?.email ?? '—'}</span>
        ),
    },
    {
      key: 'subject',
      header: 'Subject',
      render: (row) => (row.subject ? <span className={styles.subject}>{row.subject}</span> : <span className={styles.muted}>—</span>),
    },
    {
      key: 'message',
      header: 'Message',
      render: (row) => <span className={styles.message}>{row.message.length > 70 ? `${row.message.slice(0, 70)}…` : row.message}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      width: '100px',
      render: (row) =>
        row.response ? <Badge variant="success">Responded</Badge> : <Badge variant="neutral">Pending</Badge>,
    },
    {
      key: 'createdAt',
      header: 'Submitted',
      width: '150px',
      render: (row) => <span className={styles.muted}>{formatDate(row.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      width: '90px',
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => { e.stopPropagation(); setViewRecord(row); setResponseText(row.response ?? '') }}
        >
          View
        </Button>
      ),
    },
  ], [])

  const handleRespond = useCallback(async () => {
    if (!viewRecord || !responseText.trim() || responding) return
    setResponding(true)
    try {
      await apiClient(`/feedback/${viewRecord.id}/respond`, {
        method: 'PUT',
        body: { response: responseText.trim() },
        authenticated: true,
      })
      toast({ message: 'Response sent to the feedback.', variant: 'success' })
      setViewRecord(null)
      setResponseText('')
      await fetchData()
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 401) {
        router.replace('/admin-login')
      } else {
        toast({ message: 'Failed to send response.', variant: 'error' })
      }
    } finally {
      setResponding(false)
    }
  }, [viewRecord, responseText, responding, router, toast, fetchData])

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Student Feedback</h1>
      </div>

      <div className={styles.toolbar}>
        <Select
          value={filterCategory}
          onChange={(e) => { setFilterCategory(e.target.value); setPage(1) }}
          options={categoryOptions}
          placeholder="All Categories"
          className={styles.filterSelect}
        />
        <span className={styles.count}>
          {loading ? 'Loading…' : `${data.length} of ${total} feedback`}
        </span>
      </div>

      <DataTable
        columns={columns}
        data={data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)}
        getRowId={(r) => r.id}
        loading={loading}
        onRowClick={(row) => { setViewRecord(row); setResponseText(row.response ?? '') }}
        emptyState={
          <div className={styles.emptyState}>
            <p>No feedback yet.</p>
          </div>
        }
        pagination={
          data.length > 0
            ? { page, pageCount, onPageChange: setPage }
            : undefined
        }
      />

      <Dialog
        open={!!viewRecord}
        onClose={() => { setViewRecord(null); setResponseText('') }}
        title="Feedback Details"
        footer={
          viewRecord ? (
            <div className={styles.dialogFooter}>
              <Button variant="outline" onClick={() => setViewRecord(null)}>
                Close
              </Button>
              <Button
                onClick={handleRespond}
                disabled={!responseText.trim() || responding}
              >
                {responding ? 'Sending…' : viewRecord.response ? 'Update Response' : 'Send Response'}
              </Button>
            </div>
          ) : undefined
        }
      >
        {viewRecord && (
          <div className={styles.detailContent}>
            <div className={styles.detailMeta}>
              <Badge variant={viewRecord.category === 'FACULTY' ? 'warning' : 'brand'}>
                {viewRecord.category === 'FACULTY' ? 'For the Faculty' : 'For the System'}
              </Badge>
              {viewRecord.isAnonymous ? (
                <Badge variant="neutral">Anonymous</Badge>
              ) : (
                <span className={styles.detailFrom}>
                  {viewRecord.user?.student
                    ? `${viewRecord.user.student.firstName} ${viewRecord.user.student.lastName}`
                    : viewRecord.user?.email}
                </span>
              )}
              <span className={styles.detailDate}>{formatDate(viewRecord.createdAt)}</span>
            </div>

            {viewRecord.subject && (
              <div className={styles.detailField}>
                <span className={styles.detailLabel}>Subject</span>
                <p className={styles.detailText}>{viewRecord.subject}</p>
              </div>
            )}

            <div className={styles.detailField}>
              <span className={styles.detailLabel}>Message</span>
              <p className={styles.detailMessage}>{viewRecord.message}</p>
            </div>

            <div className={styles.detailField}>
              <span className={styles.detailLabel}>Response</span>
              <textarea
                className={styles.responseInput}
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Write a response to this feedback…"
                rows={4}
              />
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}
