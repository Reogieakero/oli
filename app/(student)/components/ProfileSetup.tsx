'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/apiClient'
import { Button } from '@/components/ui/Button/Button'
import { Input } from '@/components/ui/Input/Input'
import { Select } from '@/components/ui/Select/Select'
import { Spinner } from '@/components/ui/Spinner/Spinner'
import { AvatarUploader } from './AvatarUploader'
import styles from './ProfileSetup.module.css'

interface Course {
  id: string
  code: string
  name: string
}

interface SetupProfile {
  firstName: string
  lastName: string
  studentId: string
  yearLevel: number
  avatarUrl: string | null
  course: { id: string } | null
}

export function ProfileSetup({ onComplete }: { onComplete: () => void }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [courses, setCourses] = useState<Course[]>([])
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [form, setForm] = useState({ firstName: '', lastName: '', studentId: '', courseId: '', yearLevel: '' })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    async function fetchData() {
      try {
        const opts = { authenticated: true }
        const [profRes, coursesRes] = await Promise.all([
          apiClient<SetupProfile>('/students/me', opts),
          apiClient<{ data: Course[] }>('/courses?limit=1000', opts),
        ])
        setCourses(coursesRes.data)
        setAvatarUrl(profRes.avatarUrl)
        setForm({
          firstName: profRes.firstName,
          lastName: profRes.lastName,
          studentId: profRes.studentId,
          courseId: profRes.course?.id || '',
          yearLevel: String(profRes.yearLevel),
        })
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  async function handleSave() {
    const errors: Record<string, string> = {}
    if (!form.firstName.trim()) errors.firstName = 'Required'
    if (!form.lastName.trim()) errors.lastName = 'Required'
    if (!form.studentId.match(/^20\d{2}-\d{4}$/)) errors.studentId = 'Format: 20xx-xxxx'
    if (!form.courseId) errors.courseId = 'Required'
    if (!form.yearLevel) errors.yearLevel = 'Required'
    if (!avatarUrl) errors.avatar = 'Profile picture is required'
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSaving(true)
    try {
      await apiClient('/students/me', {
        method: 'PUT',
        body: {
          firstName: form.firstName,
          lastName: form.lastName,
          studentId: form.studentId,
          courseId: form.courseId,
          yearLevel: parseInt(form.yearLevel),
        },
        authenticated: true,
      })
      onComplete()
    } catch (err) {
      setFormErrors({ form: err instanceof Error ? err.message : 'Failed to save' })
    } finally {
      setSaving(false)
    }
  }

  const initials = `${form.firstName.charAt(0) || ''}${form.lastName.charAt(0) || ''}`.toUpperCase() || '?'

  if (loading) {
    return (
      <div className={styles.screen}>
        <Spinner />
      </div>
    )
  }

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Complete your profile</h1>
          <p className={styles.subtitle}>Add your photo and details to continue to the portal.</p>
        </div>

        <div className={styles.body}>
          <div className={styles.avatarSection}>
            <AvatarUploader avatarUrl={avatarUrl} initials={initials} onChange={setAvatarUrl} />
            {formErrors.avatar && (
              <span className={styles.errorText}>{formErrors.avatar}</span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label}>First Name</label>
                <Input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} placeholder="Juan" />
                {formErrors.firstName && <span className={styles.errorText}>{formErrors.firstName}</span>}
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Last Name</label>
                <Input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} placeholder="Dela Cruz" />
                {formErrors.lastName && <span className={styles.errorText}>{formErrors.lastName}</span>}
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Student ID</label>
              <Input value={form.studentId} onChange={e => setForm({ ...form, studentId: e.target.value })} placeholder="20xx-xxxx" />
              {formErrors.studentId && <span className={styles.errorText}>{formErrors.studentId}</span>}
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label}>Course</label>
                <Select
                  options={courses.map(c => ({ value: c.id, label: `${c.name} (${c.code})` }))}
                  value={form.courseId}
                  onChange={e => setForm({ ...form, courseId: e.target.value })}
                />
                {formErrors.courseId && <span className={styles.errorText}>{formErrors.courseId}</span>}
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Year Level</label>
                <Select
                  options={[
                    { value: '1', label: '1st Year' },
                    { value: '2', label: '2nd Year' },
                    { value: '3', label: '3rd Year' },
                    { value: '4', label: '4th Year' },
                  ]}
                  value={form.yearLevel}
                  onChange={e => setForm({ ...form, yearLevel: e.target.value })}
                />
                {formErrors.yearLevel && <span className={styles.errorText}>{formErrors.yearLevel}</span>}
              </div>
            </div>

            {formErrors.form && <span className={styles.errorText}>{formErrors.form}</span>}

            <Button variant="primary" onClick={handleSave} disabled={saving} style={{ marginTop: 4 }}>
              {saving ? 'Saving...' : 'Save & Continue'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
