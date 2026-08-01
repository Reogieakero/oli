'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiClient } from '@/lib/apiClient'
import { Card, CardBody } from '@/components/ui/Card/Card'
import { Badge } from '@/components/ui/Badge/Badge'
import { Button } from '@/components/ui/Button/Button'
import { Spinner } from '@/components/ui/Spinner/Spinner'
import { Dialog } from '@/components/ui/Dialog/Dialog'
import { Input } from '@/components/ui/Input/Input'
import { Select } from '@/components/ui/Select/Select'
import { useToast } from '@/components/ui/Toast/Toast'

interface BalanceItem {
  id: string
  description: string
  amount: string
  status: 'unpaid' | 'partial' | 'paid'
  dueDate: string | null
  payments: Array<{ id: string; amount: string; status: string; paymentMethod: { name: string } }>
}

interface PaymentMethod {
  id: string
  name: string
  accountName: string | null
  accountNumber: string | null
  instructions: string | null
  isActive: boolean
}

function statusBadge(status: string) {
  switch (status) {
    case 'unpaid': return { variant: 'danger' as const, label: 'Unpaid' }
    case 'partial': return { variant: 'warning' as const, label: 'Partial' }
    case 'paid': return { variant: 'success' as const, label: 'Paid' }
    default: return { variant: 'neutral' as const, label: status }
  }
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function BalancesPage() {
  const [balances, setBalances] = useState<BalanceItem[]>([])
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingTotal, setPendingTotal] = useState(0)
  const [payDialog, setPayDialog] = useState<BalanceItem | null>(null)
  const [payMethod, setPayMethod] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [payRef, setPayRef] = useState('')
  const [payFile, setPayFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    async function fetchData() {
      try {
        const opts = { authenticated: true }
        const [balRes, methRes, payRes] = await Promise.all([
          apiClient<{ data: BalanceItem[]; total: number }>('/balances?limit=100', opts),
          apiClient<{ data: PaymentMethod[] }>('/payments/methods', opts).catch(() => ({ data: [] })),
          apiClient<{ data: any[] }>('/payments/my', opts).catch(() => ({ data: [] })),
        ])
        setBalances(balRes.data)
        setMethods(methRes.data)
        setPendingTotal(payRes.data.filter((p: any) => p.status === 'pending').reduce((s: number, p: any) => s + Number(p.amount), 0))
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const totalDue = balances.reduce((s, b) => s + parseFloat(b.amount), 0)
  const totalPaid = balances.reduce((s, b) => s + b.payments.filter(p => p.status === 'approved').reduce((ps, p) => ps + parseFloat(p.amount), 0), 0)
  const outstanding = totalDue - totalPaid

  async function handleSubmitReceipt() {
    if (!payDialog || !payMethod || !payAmount) return
    setSubmitting(true)
    try {
      const hasFile = !!payFile
      const opts: any = { method: 'POST', authenticated: true }

      if (hasFile) {
        const formData = new FormData()
        formData.append('balanceId', payDialog.id)
        formData.append('paymentMethodId', payMethod)
        formData.append('amount', payAmount)
        if (payRef) formData.append('referenceNo', payRef)
        formData.append('proofReceipt', payFile)
        opts.body = formData
        opts.headers = {}
      } else {
        opts.body = {
          balanceId: payDialog.id,
          paymentMethodId: payMethod,
          amount: parseFloat(payAmount),
          referenceNo: payRef || undefined,
        }
      }

      await apiClient('/payments', opts)
      toast({ message: 'Payment submitted', variant: 'success' })
      setPayDialog(null)
      setPayMethod('')
      setPayAmount('')
      setPayRef('')
      setPayFile(null)
      const refetchOpts = { authenticated: true }
      const [balRes, payRes] = await Promise.all([
        apiClient<{ data: BalanceItem[] }>('/balances?limit=100', refetchOpts),
        apiClient<{ data: any[] }>('/payments/my', refetchOpts).catch(() => ({ data: [] })),
      ])
      setBalances(balRes.data)
      setPendingTotal(payRes.data.filter((p: any) => p.status === 'pending').reduce((s: number, p: any) => s + Number(p.amount), 0))
    } catch (err: any) {
      toast({ message: err.message || 'Failed to submit payment', variant: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-2xl)', fontWeight: 700, margin: 0 }}>
          Balances
        </h1>
        <Link href="/balances/history" style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-brand-dark)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          Payment History <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </Link>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px, 100%), 1fr))',
        gap: 12,
      }}>
        <Card>
          <CardBody>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted-fg)', textTransform: 'uppercase', letterSpacing: '0.3px', fontWeight: 500 }}>
                Total Billed
              </div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 700, marginTop: 4 }}>
                ₱{totalDue.toFixed(2)}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted-fg)', marginTop: 2 }}>
                Sum of all fee amounts billed
              </div>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted-fg)', textTransform: 'uppercase', letterSpacing: '0.3px', fontWeight: 500 }}>
                Total Paid
              </div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-status-success)', marginTop: 4 }}>
                ₱{totalPaid.toFixed(2)}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted-fg)', marginTop: 2 }}>
                Total amount you have paid so far
              </div>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted-fg)', textTransform: 'uppercase', letterSpacing: '0.3px', fontWeight: 500 }}>
                Outstanding
              </div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 700, color: outstanding > 0 ? 'var(--color-status-danger)' : 'var(--color-status-success)', marginTop: 4 }}>
                ₱{outstanding.toFixed(2)}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted-fg)', marginTop: 2 }}>
                Remaining balance to be settled
              </div>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted-fg)', textTransform: 'uppercase', letterSpacing: '0.3px', fontWeight: 500 }}>
                Pending
              </div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-status-warning)', marginTop: 4 }}>
                ₱{pendingTotal.toFixed(2)}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted-fg)', marginTop: 2 }}>
                Payments awaiting approval
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <div>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-lg)', fontWeight: 600, margin: 0, marginBottom: 12 }}>
          Fees
        </h2>
        {loading ? (
          <Spinner style={{ padding: 24 }} />
        ) : balances.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-muted-fg)' }}>No balances yet.</div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(380px, 100%), 1fr))',
            gap: 12,
          }}>
            {balances.map((b) => {
              const badge = statusBadge(b.status)
              const amountPaid = b.payments.filter(p => p.status === 'approved').reduce((ps, p) => ps + parseFloat(p.amount), 0)
              const oustandingItem = parseFloat(b.amount) - amountPaid
              return (
                <Card key={b.id}>
                  <CardBody style={{ minHeight: 160, padding: 0 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 160 }}>
                      <div style={{ flex: 1, padding: '14px 16px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                            <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{b.description}</span>
                            <Badge variant={badge.variant}>{badge.label}</Badge>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted-fg)' }}>Outstanding</div>
                            <div style={{
                              fontWeight: 700, fontSize: 'var(--text-base)',
                              color: oustandingItem > 0 ? 'var(--color-status-danger)' : 'var(--color-status-success)',
                            }}>
                              ₱{oustandingItem.toFixed(2)}
                            </div>
                          </div>
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted-fg)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          <span>Due: {formatDate(b.dueDate)}</span>
                          <span>Amount: ₱{parseFloat(b.amount).toFixed(2)}</span>
                          <span>Paid: ₱{amountPaid.toFixed(2)}</span>
                        </div>
                      </div>
                      <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '8px 16px', borderTop: '1px solid var(--color-border)',
                      }}>
                        {b.status !== 'paid' ? (
                          <Button size="sm" variant="primary" onClick={() => { setPayDialog(b); setPayAmount(oustandingItem.toFixed(2)) }}>
                            Pay
                          </Button>
                        ) : <div />}
                        <Link
                          href={`/balances/${b.id}`}
                          style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-brand-dark)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 2 }}
                        >
                          View More <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                        </Link>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <Dialog open={!!payDialog} onClose={() => setPayDialog(null)} title="Submit Payment">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {payDialog && (
            <div style={{ fontSize: 'var(--text-sm)' }}>
              <strong>{payDialog.description}</strong> — ₱{parseFloat(payDialog.amount).toFixed(2)}
            </div>
          )}
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
            <Button variant="ghost" onClick={() => setPayDialog(null)}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmitReceipt} disabled={submitting || !payMethod || !payAmount}>
              Submit Payment
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
