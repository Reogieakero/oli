'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { apiClient } from '@/lib/apiClient'
import { Button } from '@/components/ui/Button/Button'
import { Badge } from '@/components/ui/Badge/Badge'
import { Dialog } from '@/components/ui/Dialog/Dialog'
import { Input } from '@/components/ui/Input/Input'
import { useToast } from '@/components/ui/Toast/Toast'
import styles from './page.module.css'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function AdminReceiptsPage() {
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'pending' | 'processed'>('pending')
  const [receiptDialog, setReceiptDialog] = useState<string | null>(null)
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)
  const [rejectPaymentId, setRejectPaymentId] = useState<string | null>(null)
  const [rejectNotes, setRejectNotes] = useState('')
  const { toast } = useToast()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [pend, all] = await Promise.all([
        apiClient<{ data: any[] }>('/payments/pending', { authenticated: true }),
        apiClient<{ data: any[] }>('/payments/all', { authenticated: true }).catch(() => ({ data: [] })),
      ])
      const byId = new Map<string, any>()
      all.data.forEach(p => byId.set(p.id, p))
      pend.data.forEach(p => { if (!byId.has(p.id)) byId.set(p.id, p) })
      setPayments(Array.from(byId.values()))
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (!receiptDialog) { setReceiptUrl(null); return }
    let cancelled = false
    apiClient<{ signedUrl: string }>(`/payments/receipts/${encodeURIComponent(receiptDialog)}`, { authenticated: true })
      .then(res => { if (!cancelled) setReceiptUrl(res.signedUrl) })
      .catch(() => { if (!cancelled) setReceiptUrl(null) })
    return () => { cancelled = true }
  }, [receiptDialog])

  const pending = payments.filter(p => p.status === 'pending')
  const processed = payments.filter(p => p.status !== 'pending')

  const handleApprove = async (id: string) => {
    try {
      await apiClient(`/payments/${id}/approve`, { method: 'PATCH', authenticated: true })
      toast({ message: 'Payment approved', variant: 'success' })
      fetchData()
    } catch (err: any) {
      toast({ message: err.message || 'Failed to approve', variant: 'error' })
    }
  }

  const handleReject = async () => {
    if (!rejectPaymentId) return
    try {
      await apiClient(`/payments/${rejectPaymentId}/reject`, {
        method: 'PATCH',
        body: { adminNotes: rejectNotes || undefined },
        authenticated: true,
      })
      toast({ message: 'Payment rejected', variant: 'success' })
      setRejectPaymentId(null)
      setRejectNotes('')
      fetchData()
    } catch (err: any) {
      toast({ message: err.message || 'Failed to reject', variant: 'error' })
    }
  }

  const handleRevert = async (id: string) => {
    try {
      await apiClient(`/payments/${id}/revert`, { method: 'PATCH', authenticated: true })
      toast({ message: 'Payment reverted to pending', variant: 'success' })
      fetchData()
    } catch (err: any) {
      toast({ message: err.message || 'Failed to revert', variant: 'error' })
    }
  }

  const renderCard = (p: any, isProcessed: boolean) => (
    <div key={p.id} className={isProcessed ? styles.cardProcessed : styles.card}>
      <div className={styles.info}>
        <div className={styles.name}>
          {p.balance?.student?.firstName} {p.balance?.student?.lastName}
          <span style={{ color: 'var(--color-muted-fg)', fontWeight: 400, marginLeft: 6 }}>({p.balance?.student?.studentId})</span>
        </div>
        <div className={styles.details}>
          {p.balance?.description} &middot; ₱{Number(p.amount).toFixed(2)} via {p.paymentMethod?.name}
        </div>
        <div className={styles.details}>
          {formatDate(p.createdAt)} {p.referenceNo && `· Ref: ${p.referenceNo}`}
        </div>
        {p.adminNotes && (
          <div style={{ color: 'var(--color-status-danger)', fontSize: 'var(--text-xs)', marginTop: 2 }}>
            Note: {p.adminNotes}
          </div>
        )}
      </div>
      <div className={styles.actions}>
        <Badge variant={p.status === 'approved' ? 'success' : p.status === 'rejected' ? 'danger' : 'warning'}>
          {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
        </Badge>
        {p.proofReceipt && (
          <Button variant="outline" size="sm" onClick={() => setReceiptDialog(p.proofReceipt)}>Receipt</Button>
        )}
        {p.status === 'pending' ? (
          <>
            <Button variant="primary" size="sm" onClick={() => handleApprove(p.id)}>Approve</Button>
            <Button variant="destructive" size="sm" onClick={() => { setRejectPaymentId(p.id); setRejectNotes('') }}>Reject</Button>
          </>
        ) : (
          <Button variant="outline" size="sm" onClick={() => handleRevert(p.id)}>Undo</Button>
        )}
      </div>
    </div>
  )

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/admin/balances" className={styles.backLink}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          Back
        </Link>
        <h1 className={styles.title}>Receipts</h1>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'pending' ? styles.tabActive : ''}`} onClick={() => setTab('pending')}>
          Pending ({pending.length})
        </button>
        <button className={`${styles.tab} ${tab === 'processed' ? styles.tabActive : ''}`} onClick={() => setTab('processed')}>
          Processed ({processed.length})
        </button>
      </div>

      {loading ? (
        <div className={styles.empty}>Loading...</div>
      ) : tab === 'pending' ? (
        pending.length === 0 ? (
          <div className={styles.empty}>No pending receipts.</div>
        ) : (
          pending.map(p => renderCard(p, false))
        )
      ) : (
        processed.length === 0 ? (
          <div className={styles.empty}>No processed receipts yet.</div>
        ) : (
          processed.map(p => renderCard(p, true))
        )
      )}

      <Dialog open={!!receiptDialog} onClose={() => setReceiptDialog(null)} title="Proof of Payment">
        {receiptDialog && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-muted-fg)', marginBottom: 12 }}>File: {receiptDialog.split('/').pop()}</p>
            {receiptUrl ? (
              <img src={receiptUrl} alt="Receipt" style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 'var(--radius-control)' }} />
            ) : (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-muted-fg)' }}>Receipt unavailable.</p>
            )}
          </div>
        )}
      </Dialog>

      <Dialog open={!!rejectPaymentId} onClose={() => setRejectPaymentId(null)} title="Reject Payment"
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => setRejectPaymentId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject}>Reject Payment</Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ margin: 0, fontSize: 'var(--text-sm)' }}>Reject this payment?</p>
          <div>
            <label style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>Notes (optional)</label>
            <Input value={rejectNotes} onChange={e => setRejectNotes(e.target.value)} placeholder="Reason for rejection..." />
          </div>
        </div>
      </Dialog>
    </div>
  )
}
