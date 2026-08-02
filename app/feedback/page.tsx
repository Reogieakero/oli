'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { apiClient, ApiError } from '@/lib/apiClient'
import { Button } from '@/components/ui/Button/Button'
import styles from './page.module.css'

type Category = 'system' | 'faculty'

const CATEGORIES: { id: Category; title: string; desc: string }[] = [
  {
    id: 'system',
    title: 'For the System',
    desc: 'Report bugs, share suggestions, or let us know what you think about Liberalis.',
  },
  {
    id: 'faculty',
    title: 'For the Faculty',
    desc: 'Give feedback about events, attendance, announcements, or anything faculty-related.',
  },
]

export default function FeedbackPage() {
  const [category, setCategory] = useState<Category>('system')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isSignedIn = typeof document !== 'undefined' && !!document.cookie.match(/(?:^|;\s*)access_token=([^;]*)/)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await apiClient('/feedback', {
        method: 'POST',
        authenticated: isSignedIn,
        body: {
          category,
          subject: subject.trim() || undefined,
          message: message.trim(),
          isAnonymous: true,
        },
      })
      setSubmitted(true)
      setSubject('')
      setMessage('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.brand}>
          <Image src="/Logo.jpg" alt="Liberalis" width={26} height={26} className={styles.brandLogo} style={{ borderRadius: '5px' }} />
          <span className={styles.brandName}>Liberalis</span>
        </Link>
        {isSignedIn ? (
          <Link href="/dashboard" className={styles.navLink}>
            Go to Dashboard
          </Link>
        ) : (
          <Link href="/" className={styles.navLink}>
            Go to Landing Page
          </Link>
        )}
      </nav>

      <main className={styles.main}>
        <div className={styles.card}>
          <header className={styles.header}>
            <div className={styles.iconWrap}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h1 className={styles.title}>Send Feedback</h1>
            <p className={styles.subtitle}>
              Your feedback helps us improve. It is sent <strong>anonymously</strong> — no name is shared.
            </p>
          </header>

          {submitted ? (
            <div className={styles.successBox}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <h2 className={styles.successTitle}>Thank you!</h2>
              <p className={styles.successText}>Your feedback has been sent anonymously. The faculty will review it soon.</p>
              <Button variant="outline" onClick={() => setSubmitted(false)}>
                Send another
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.fieldGroup}>
                <span className={styles.label}>Category</span>
                <div className={styles.categoryGrid}>
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategory(c.id)}
                      className={`${styles.categoryCard} ${category === c.id ? styles.categoryActive : ''}`}
                      aria-pressed={category === c.id}
                    >
                      <span className={styles.categoryTitle}>{c.title}</span>
                      <span className={styles.categoryDesc}>{c.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="fb-subject">Subject <span className={styles.optional}>(optional)</span></label>
                <input
                  id="fb-subject"
                  className={styles.input}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. App is slow to load"
                  maxLength={150}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="fb-message">Message</label>
                <textarea
                  id="fb-message"
                  className={styles.textarea}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us what's on your mind…"
                  rows={6}
                  maxLength={5000}
                  required
                />
              </div>

              {error && <div className={styles.error}>{error}</div>}

              <Button type="submit" disabled={!message.trim() || submitting} className={styles.submitBtn}>
                {submitting ? 'Sending…' : 'Send Feedback Anonymously'}
              </Button>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
