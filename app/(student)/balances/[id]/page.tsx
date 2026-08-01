'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiClient } from '@/lib/apiClient'
import { Badge } from '@/components/ui/Badge/Badge'
import { Card, CardBody } from '@/components/ui/Card/Card'
import { Button } from '@/components/ui/Button/Button'
import { Spinner } from '@/components/ui/Spinner/Spinner'
import { Dialog } from '@/components/ui/Dialog/Dialog'
import { Input } from '@/components/ui/Input/Input'
import { Select } from '@/components/ui/Select/Select'
import { useToast } from '@/components/ui/Toast/Toast'

interface FeeDetail {
  id: string
  description: string
  amount: string
  status: 'unpaid' | 'partial' | 'paid'
  dueDate: string | null
  student: { id: string; firstName: string; lastName: string; studentId: string }
  payments: Array<{
    id: string
    amount: string
    referenceNo: string | null
    status: string
    paidAt: string
    notes: string | null
    paymentMethod: { name: string }
  }>
}

interface PaymentMethod {
  id: string
  name: string
  accountName: string | null
  accountNumber: string | null
  instructions: string | null
  isActive: boolean
}

function statusBadge(s: string) {
  switch (s) {
    case 'unpaid': return { variant: 'danger' as const, label: 'Unpaid' }
    case 'partial': return { variant: 'warning' as const, label: 'Partial' }
    case 'paid': return { variant: 'success' as const, label: 'Paid' }
    default: return { variant: 'neutral' as const, label: s }
  }
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function ChevronLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

export default function FeeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [fee, setFee] = useState<FeeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [payDialog, setPayDialog] = useState(false)
  const [payMethod, setPayMethod] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [payRef, setPayRef] = useState('')
  const [payFile, setPayFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    async function fetchFee() {
      try {
        const [feeRes, methRes] = await Promise.all([
          apiClient<FeeDetail>(`/balances/${id}`, { authenticated: true }),
          apiClient<{ data: PaymentMethod[] }>('/payments/methods', { authenticated: true }).catch(() => ({ data: [] })),
        ])
        setFee(feeRes)
        setMethods(methRes.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchFee()
  }, [id])

  if (loading) return <Spinner style={{ padding: 40 }} />
  if (!fee) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-muted-fg)' }}>Fee not found.</div>

  const badge = statusBadge(fee.status)
  const amountPaid = fee.payments.filter(p => p.status === 'approved').reduce((s, p) => s + parseFloat(p.amount), 0)
  const outstanding = parseFloat(fee.amount) - amountPaid

  async function handleSubmitPayment() {
    if (!fee || !payMethod || !payAmount) return
    setSubmitting(true)
    try {
      const hasFile = !!payFile
      const opts: { method: string; authenticated: boolean; body?: unknown; headers?: Record<string, string> } = { method: 'POST', authenticated: true }

      if (hasFile) {
        const formData = new FormData()
        formData.append('balanceId', fee.id)
        formData.append('paymentMethodId', payMethod)
        formData.append('amount', payAmount)
        if (payRef) formData.append('referenceNo', payRef)
        formData.append('proofReceipt', payFile)
        opts.body = formData
        opts.headers = {}
      } else {
        opts.body = {
          balanceId: fee.id,
          paymentMethodId: payMethod,
          amount: parseFloat(payAmount),
          referenceNo: payRef || undefined,
        }
      }

      await apiClient('/payments', opts)
      toast({ message: 'Payment submitted', variant: 'success' })
      setPayDialog(false)
      setPayMethod('')
      setPayAmount('')
      setPayRef('')
      setPayFile(null)
      const updated = await apiClient<FeeDetail>(`/balances/${id}`, { authenticated: true })
      setFee(updated)
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : 'Failed to submit payment', variant: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <button
        onClick={() => router.back()}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--color-muted-fg)', fontSize: 'var(--text-sm)',
          padding: '6px 0', width: 'fit-content',
          transition: 'color 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-brand-dark)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-muted-fg)')}
      >
        <ChevronLeft /> Back
      </button>

      <Card>
        <CardBody style={{ padding: 0 }}>
          <div style={{
            background: fee.status === 'paid' ? 'var(--color-status-success-bg)' : outstanding > 0 ? 'var(--color-status-danger-bg)' : 'var(--color-muted-bg)',
            padding: 28, borderRadius: 'var(--radius-control) var(--radius-control) 0 0',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
          }}>
            <div>
              <h1 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 700 }}>
                {fee.description}
              </h1>
              <div style={{ marginTop: 6 }}>
                <Badge variant={badge.variant}>{badge.label}</Badge>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted-fg)' }}>Outstanding</div>
              <div style={{
                fontSize: 'var(--text-2xl)', fontWeight: 700,
                color: outstanding > 0 ? 'var(--color-status-danger)' : 'var(--color-status-success)',
              }}>
                ₱{outstanding.toFixed(2)}
              </div>
            </div>
          </div>

          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Amount', value: `₱${parseFloat(fee.amount).toFixed(2)}` },
                { label: 'Amount Paid', value: `₱${amountPaid.toFixed(2)}` },
                { label: 'Due Date', value: formatDate(fee.dueDate) },
                { label: 'Student', value: `${fee.student.firstName} ${fee.student.lastName} (${fee.student.studentId})` },
              ].map((m) => (
                <div key={m.label} style={{
                  display: 'flex', alignItems: 'baseline',
                  padding: '8px 0', borderBottom: '1px solid var(--color-border)',
                }}>
                  <span style={{
                    minWidth: 120, fontSize: 'var(--text-xs)',
                    color: 'var(--color-muted-fg)', fontWeight: 500,
                    textTransform: 'uppercase', letterSpacing: '0.3px',
                  }}>
                    {m.label}
                  </span>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                    {m.value}
                  </span>
                </div>
              ))}
            </div>

            {fee.status !== 'paid' && (
              <Button variant="primary" onClick={() => { setPayDialog(true); setPayAmount(outstanding.toFixed(2)) }}>
                Pay Now
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      {fee.payments.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h3 style={{
            fontFamily: 'var(--font-heading)', fontSize: 'var(--text-sm)',
            fontWeight: 600, margin: 0,
            textTransform: 'uppercase', letterSpacing: '0.3px',
            color: 'var(--color-muted-fg)',
          }}>
            Payment History ({fee.payments.length})
          </h3>
          {fee.payments.map((p) => (
            <Card key={p.id}>
              <CardBody>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{p.paymentMethod.name}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted-fg)' }}>
                      {formatDate(p.paidAt)} {p.referenceNo && `· Ref: ${p.referenceNo}`}
                    </div>
                    {p.notes && (
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted-fg)' }}>
                        Note: {p.notes}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>
                      ₱{parseFloat(p.amount).toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={payDialog} onClose={() => setPayDialog(false)} title="Submit Payment">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 'var(--text-sm)' }}>
            <strong>{fee.description}</strong> — ₱{parseFloat(fee.amount).toFixed(2)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>Payment Method</label>
            {(() => {
              const active = methods.filter(m => m.isActive)
              if (active.length === 0) {
                return (
                  <Select
                    options={[{ value: '', label: 'No payment method yet' }]}
                    value=""
                    onChange={() => {}}
                    disabled
                    placeholder="No payment method yet"
                  />
                )
              }
              return (
                <Select
                  options={active.map(m => ({ value: m.id, label: m.name }))}
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value)}
                />
              )
            })()}
          </div>
          {payMethod && (() => {
            const m = methods.find(m => m.id === payMethod)
            if (!m) return null
            return (
              <div style={{ padding: '12px 14px', background: 'var(--color-muted-bg)', borderRadius: 'var(--radius-control)', fontSize: 'var(--text-sm)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontWeight: 600 }}>{m.name}</div>
                {m.accountName && <div>Account: {m.accountName}</div>}
                {m.accountNumber && <div>Number: {m.accountNumber}</div>}
                {m.instructions && <div style={{ color: 'var(--color-muted-fg)', marginTop: 2 }}>{m.instructions}</div>}
              </div>
            )
          })()}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>Amount</label>
            <Input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>Reference No. (optional)</label>
            <Input value={payRef} onChange={e => setPayRef(e.target.value)} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>Proof of Payment (optional)</label>
            <label style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 14px', border: '1px dashed var(--color-border)',
              borderRadius: 'var(--radius-control)', cursor: 'pointer',
              fontSize: 'var(--text-sm)', color: 'var(--color-muted-fg)',
              transition: 'border-color 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-brand-dark)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              {payFile ? payFile.name : 'Choose file'}
              <input
                type="file"
                accept="image/*"
                onChange={e => setPayFile(e.target.files?.[0] || null)}
                style={{ display: 'none' }}
              />
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setPayDialog(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmitPayment} disabled={submitting || !payMethod || !payAmount}>
              Submit Payment
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
