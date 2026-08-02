'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button/Button'
import { Input } from '@/components/ui/Input/Input'
import { Select } from '@/components/ui/Select/Select'
import { LoadingOverlay } from '@/components/ui/LoadingOverlay/LoadingOverlay'
import { usePageTitle } from '@/lib/usePageTitle'
import styles from './CompleteProfile.module.css'

interface Course {
  id: string
  code: string
  name: string
}

export default function CompleteProfilePage() {
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [studentId, setStudentId] = useState('')
  const [courseId, setCourseId] = useState('')
  const [yearLevel, setYearLevel] = useState('')
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingCourses, setLoadingCourses] = useState(true)
  const [error, setError] = useState('')
  const [studentIdError, setStudentIdError] = useState('')
  usePageTitle('Complete Your Profile')

  useEffect(() => {
    if (studentId && !/^20\d{2}-\d{4}$/.test(studentId)) {
      setStudentIdError('Format: 20xx-xxxx (e.g. 2024-0001)')
    } else {
      setStudentIdError('')
    }
  }, [studentId])

  useEffect(() => {
    async function fetchCourses() {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1'
        const res = await fetch(`${baseUrl}/courses`, {
          headers: { Authorization: `Bearer ${document.cookie.match(/(?:^|;\s*)access_token=([^;]*)/)?.[1] || ''}` },
        })
        if (!res.ok) throw new Error('Failed to load courses')
        const data = await res.json()
        setCourses(data.data || data)
      } catch (err: any) {
        setError(err.message || 'Failed to load courses')
      } finally {
        setLoadingCourses(false)
      }
    }
    fetchCourses()
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!firstName || !lastName || !studentId || !courseId || !yearLevel) {
      setError('All fields are required.')
      return
    }

    if (!/^20\d{2}-\d{4}$/.test(studentId)) {
      setError('Student ID must follow the format 20xx-xxxx (e.g. 2024-0001)')
      return
    }

    setLoading(true)

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1'
      const token = document.cookie.match(/(?:^|;\s*)access_token=([^;]*)/)?.[1]

      const res = await fetch(`${baseUrl}/students/me/complete-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName,
          lastName,
          studentId,
          courseId,
          yearLevel: parseInt(yearLevel),
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error?.message || 'Failed to complete profile')
      }

      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Something went wrong.')
      setLoading(false)
    }
  }

  const courseOptions = courses.length > 0
    ? courses.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))
    : [{ value: '', label: 'No courses available' }]
  const yearOptions = [
    { value: '1', label: '1st Year' },
    { value: '2', label: '2nd Year' },
    { value: '3', label: '3rd Year' },
    { value: '4', label: '4th Year' },
  ]

  return (
    <LoadingOverlay visible={loading} message="Saving your profile..." fullscreen>
      <div className={styles.page}>
        <div className={styles.brandMark}>
          Liberalis
        </div>

      <div className={styles.card}>
        <div className={styles.cardBody}>
          <div className={styles.header}>
            <h1 className={styles.title}>Complete Your Profile</h1>
            <p className={styles.subtitle}>
              Welcome! Please fill in your details to start using your student portal.
            </p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            {error && <div className={styles.error} role="alert">{error}</div>}

            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label}>First Name</label>
                <Input
                  placeholder="Enter your first name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Last Name</label>
                <Input
                  placeholder="Enter your last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Student ID</label>
              <Input
                placeholder="20xx-xxxx"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                disabled={loading}
                className={studentIdError ? styles.inputError : ''}
              />
              {studentIdError && <span className={styles.fieldError} role="alert">{studentIdError}</span>}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Course</label>
              <Select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                options={courseOptions}
                placeholder={loadingCourses ? 'Loading courses...' : 'Select your course'}
                disabled={loading || loadingCourses}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Year Level</label>
              <Select
                value={yearLevel}
                onChange={(e) => setYearLevel(e.target.value)}
                options={yearOptions}
                placeholder="Select your year level"
                disabled={loading}
              />
            </div>

            <Button type="submit" disabled={loading || loadingCourses} size="lg" className={styles.submitBtn}>
              Complete Profile
            </Button>
          </form>
        </div>
      </div>
      </div>
    </LoadingOverlay>
  )
}
