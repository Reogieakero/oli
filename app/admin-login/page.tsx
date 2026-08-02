'use client'

import { useState, FormEvent } from 'react'
import { z } from 'zod'
import { Button } from '@/components/ui/Button/Button'
import { Input } from '@/components/ui/Input/Input'
import { Card, CardBody } from '@/components/ui/Card/Card'
import styles from './AdminLogin.module.css'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
})

type FieldErrors = Partial<Record<'email' | 'password', string>>

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setServerError('')
    setFieldErrors({})

    const result = loginSchema.safeParse({ email, password })
    if (!result.success) {
      const errors: FieldErrors = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0] as 'email' | 'password'
        if (!errors[field]) errors[field] = issue.message
      }
      setFieldErrors(errors)
      return
    }

    setLoading(true)

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1'
      const res = await fetch(`${baseUrl}/auth/login/faculty`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const message = body?.error?.message
        if (res.status === 401) {
          setServerError('Incorrect email or password.')
        } else {
          setServerError(message || 'Something went wrong. Please try again.')
        }
        setLoading(false)
        return
      }

      const data = await res.json()

      document.cookie = `access_token=${data.accessToken}; path=/; Secure; SameSite=Lax; max-age=${60 * 60 * 8}`
      document.cookie = `refresh_token=${data.refreshToken}; path=/; Secure; SameSite=Lax; max-age=${60 * 60 * 24 * 7}`

      window.location.href = '/admin/dashboard'
    } catch (err) {
      setServerError('Unable to connect to the server. Please check your connection.')
      setLoading(false)
    }
  }

  const emailIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </svg>
  )

  const lockIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )

  const visibilityIcon = showPassword ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a3 3 0 0 0 4.24 4.24" />
      <path d="M9.9 4.24A10.4 10.4 0 0 1 12 4c6.5 0 10 8 10 8a17.6 17.6 0 0 1-3.06 4.06M6.1 6.1C3.6 7.8 2 10 2 10s3.5 7 10 7c1.1 0 2.1-.16 3-.46" />
    </svg>
  )

  return (
    <div className={styles.page}>
      <div className={styles.brandMark}>
        Liberalis
      </div>

      <Card className={styles.card}>
        <CardBody className={styles.cardBody}>
          <div className={styles.header}>
            <h1 className={styles.title}>Admin Login</h1>
            <p className={styles.subtitle}>Sign in to manage the attendance system</p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            {serverError && <div className={styles.error} role="alert">{serverError}</div>}

            <div className={styles.field}>
              <Input
                leadingIcon={emailIcon}
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={loading}
                aria-label="Email"
                className={fieldErrors.email ? styles.inputError : ''}
              />
              {fieldErrors.email && <span className={styles.fieldError} role="alert">{fieldErrors.email}</span>}
            </div>

            <div className={styles.field}>
              <Input
                leadingIcon={lockIcon}
                trailingIcon={
                  <button
                    type="button"
                    className={styles.toggleVisibility}
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {visibilityIcon}
                  </button>
                }
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={loading}
                aria-label="Password"
                className={fieldErrors.password ? styles.inputError : ''}
              />
              {fieldErrors.password && <span className={styles.fieldError} role="alert">{fieldErrors.password}</span>}
              <div className={styles.forgotRow}>
                <a href="#" className={styles.forgotLink} onClick={(e) => e.preventDefault()}>
                  Forgot password?
                </a>
              </div>
            </div>

            <Button type="submit" disabled={loading} size="lg" className={styles.submitBtn}>
              {loading ? 'Signing in...' : 'Get Started'}
            </Button>
          </form>

          <hr className={styles.divider} />

          <div className={styles.footer}>
            <p className={styles.footerText}>Liberalis Attendance System &middot; Faculty Access</p>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
