'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiClient } from '@/lib/apiClient'
import { Badge } from '@/components/ui/Badge/Badge'
import { Card, CardBody } from '@/components/ui/Card/Card'
import { Spinner } from '@/components/ui/Spinner/Spinner'

interface PaymentRecord {
  id: string
  amount: string
  referenceNo: string | null
  proofReceipt: string | null
  status: 'pending' | 'approved' | 'rejected'
  adminNotes: string | null
  paidAt: string
  createdAt: string
  paymentMethod: { name: string }
  balance: { description: string; amount: string }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function statusBadge(status: string) {
  switch (status) {
    case 'approved': return { variant: 'success' as const, label: 'Approved' }
    case 'pending': return { variant: 'warning' as const, label: 'Pending' }
    case 'rejected': return { variant: 'danger' as const, label: 'Rejected' }
    default: return { variant: 'neutral' as const, label: status }
  }
}

function ChevronLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

export default function PaymentHistoryPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await apiClient<{ data: PaymentRecord[] }>('/payments/my', { authenticated: true })
        setPayments(res.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Link href="/balances" style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-muted-fg)', fontSize: 'var(--text-sm)', textDecoration: 'none', width: 'fit-content' }}>
          <ChevronLeft /> Back
        </Link>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 700, margin: 0 }}>
          Payment History
        </h1>
      </div>

      {loading ? (
        <Spinner style={{ padding: 40 }} />
      ) : payments.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-muted-fg)' }}>No payment history yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {payments.map((p) => {
            const badge = statusBadge(p.status)
            return (
              <Card key={p.id}>
                <CardBody>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{p.balance.description}</span>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted-fg)' }}>
                        ₱{Number(p.amount).toFixed(2)} via {p.paymentMethod.name} &middot; {formatDate(p.createdAt)}
                      </div>
                      {p.referenceNo && (
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted-fg)' }}>
                          Ref: {p.referenceNo}
                        </div>
                      )}
                      {p.adminNotes && (
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-status-danger)', marginTop: 2 }}>
                          Note: {p.adminNotes}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 'var(--text-sm)', fontWeight: 700 }}>
                      ₱{Number(p.amount).toFixed(2)}
                    </div>
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
