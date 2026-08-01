'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/apiClient'
import { Card, CardHeader, CardBody } from '@/components/ui/Card/Card'
import { Button } from '@/components/ui/Button/Button'
import { Input } from '@/components/ui/Input/Input'
import { Select } from '@/components/ui/Select/Select'
import { useToast } from '@/components/ui/Toast/Toast'
import { Spinner } from '@/components/ui/Spinner/Spinner'
import { AvatarUploader } from '../components/AvatarUploader'
import QRCode from 'qrcode'

interface StudentProfile {
  id: string
  userId: string
  firstName: string
  lastName: string
  studentId: string
  yearLevel: number
  email: string
  course: { id: string; code: string; name: string } | null
  avatarUrl: string | null
  profileComplete: boolean
  qrCodeToken: string
  qrRegeneratedAt: string | null
}

interface Course {
  id: string
  code: string
  name: string
}

export default function ProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [qrFullscreen, setQrFullscreen] = useState(false)

  const [form, setForm] = useState({ firstName: '', lastName: '', studentId: '', courseId: '', yearLevel: '' })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    async function fetchData() {
      try {
        const opts = { authenticated: true }
        const [profRes, coursesRes] = await Promise.all([
          apiClient<StudentProfile>('/students/me', opts),
          apiClient<{ data: Course[] }>('/courses?limit=1000', opts),
        ])
        setProfile(profRes)
        setCourses(coursesRes.data)
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

  useEffect(() => {
    if (profile?.qrCodeToken) {
      QRCode.toDataURL(profile.qrCodeToken, {
        width: 400,
        margin: 2,
        color: { dark: '#1F5C6E', light: '#ffffff' },
      }).then(setQrDataUrl)
    }
  }, [profile?.qrCodeToken])

  async function handleSave() {
    const errors: Record<string, string> = {}
    if (!form.firstName.trim()) errors.firstName = 'Required'
    if (!form.lastName.trim()) errors.lastName = 'Required'
    if (!form.studentId.match(/^20\d{2}-\d{4}$/)) errors.studentId = 'Format: 20xx-xxxx'
    if (!form.courseId) errors.courseId = 'Required'
    if (!form.yearLevel) errors.yearLevel = 'Required'
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSaving(true)
    try {
      const updated = await apiClient<StudentProfile>('/students/me', {
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
      setProfile(updated)
      setEditing(false)
      toast({ message: 'Profile updated', variant: 'success' })
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : 'Failed to update', variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function handleRegenerateQr() {
    try {
      const res = await apiClient<{ qrCodeToken: string; qrRegeneratedAt: string }>('/students/me/regenerate-qr', {
        method: 'POST',
        authenticated: true,
      })
      setProfile(prev => prev ? { ...prev, qrCodeToken: res.qrCodeToken, qrRegeneratedAt: res.qrRegeneratedAt } : prev)
      toast({ message: 'QR code regenerated', variant: 'success' })
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : 'Failed to regenerate QR', variant: 'error' })
    }
  }

  function handleLogout() {
    document.cookie = 'access_token=; path=/; max-age=0'
    document.cookie = 'refresh_token=; path=/; max-age=0'
    router.replace('/login')
  }

  function handleAvatarChange(avatarUrl: string) {
    setProfile(prev => prev ? { ...prev, avatarUrl } : prev)
  }

  if (loading) return <Spinner />
  if (!profile) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-muted-fg)' }}>Profile not found.</div>

  const metaRows = [
    { label: 'Email', value: profile.email },
    { label: 'Course', value: profile.course ? `${profile.course.name} (${profile.course.code})` : '—' },
    { label: 'Year Level', value: profile.yearLevel ? `${profile.yearLevel}${profile.yearLevel === 1 ? 'st' : profile.yearLevel === 2 ? 'nd' : profile.yearLevel === 3 ? 'rd' : 'th'} Year` : '—' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-2xl)', fontWeight: 700, margin: 0 }}>Profile</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(380px, 100%), 1fr))', gap: 16 }}>
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: 'var(--text-base)', fontWeight: 600 }}>
                Personal Information
              </h3>
              {!editing && (
                <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Edit</Button>
              )}
            </div>
          </CardHeader>
          <CardBody>
            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>First Name</label>
                    <Input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} />
                    {formErrors.firstName && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-status-danger)' }}>{formErrors.firstName}</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>Last Name</label>
                    <Input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} />
                    {formErrors.lastName && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-status-danger)' }}>{formErrors.lastName}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>Student ID</label>
                  <Input value={form.studentId} onChange={e => setForm({ ...form, studentId: e.target.value })} placeholder="20xx-xxxx" />
                  {formErrors.studentId && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-status-danger)' }}>{formErrors.studentId}</span>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>Course</label>
                  <Select
                    options={courses.map(c => ({ value: c.id, label: `${c.name} (${c.code})` }))}
                    value={form.courseId}
                    onChange={e => setForm({ ...form, courseId: e.target.value })}
                  />
                  {formErrors.courseId && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-status-danger)' }}>{formErrors.courseId}</span>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>Year Level</label>
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
                  {formErrors.yearLevel && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-status-danger)' }}>{formErrors.yearLevel}</span>}
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <Button variant="ghost" onClick={() => { setEditing(false); setFormErrors({}) }}>Cancel</Button>
                  <Button variant="primary" onClick={handleSave} disabled={saving}>Save</Button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                  paddingBottom: 16, borderBottom: '1px solid var(--color-border)', marginBottom: 4,
                }}>
                  <AvatarUploader
                    avatarUrl={profile.avatarUrl}
                    initials={`${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase() || '?'}
                    onChange={handleAvatarChange}
                  />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-base)' }}>{profile.firstName} {profile.lastName}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted-fg)' }}>{profile.studentId}</div>
                  </div>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                  <tbody>
                    {metaRows.map((row, i) => (
                      <tr key={row.label}>
                        <td style={{
                          padding: '10px 16px 10px 0', width: 100,
                          color: 'var(--color-muted-fg)', fontWeight: 500,
                          verticalAlign: 'top', whiteSpace: 'nowrap',
                          borderBottom: i < metaRows.length - 1 ? '1px solid var(--color-border)' : 'none',
                        }}>
                          {row.label}
                        </td>
                        <td style={{
                          padding: '10px 0',
                          verticalAlign: 'top',
                          borderBottom: i < metaRows.length - 1 ? '1px solid var(--color-border)' : 'none',
                        }}>
                          {row.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: 'var(--text-base)', fontWeight: 600 }}>
              QR Code
            </h3>
          </CardHeader>
          <CardBody>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '12px 0' }}>
              {qrDataUrl ? (
                <div style={{
                  background: '#fff', padding: 12, borderRadius: 'var(--radius-control)',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                }}>
                  <img
                    src={qrDataUrl}
                    alt="Student QR Code"
                    style={{ width: 180, height: 180, display: 'block', cursor: 'pointer' }}
                    onClick={() => setQrFullscreen(true)}
                  />
                </div>
              ) : (
                <div style={{ width: 180, height: 180, background: 'var(--color-muted-bg)', borderRadius: 'var(--radius-control)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
                    <circle cx="12" cy="12" r="10" stroke="var(--color-border)" strokeWidth="3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--color-brand-dark)" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </div>
              )}
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted-fg)', textAlign: 'center' }}>
                {profile.qrRegeneratedAt ? `Last updated: ${new Date(profile.qrRegeneratedAt).toLocaleDateString()}` : 'Show this to faculty to scan'}
              </div>
              <Button size="sm" variant="ghost" onClick={handleRegenerateQr}>
                Regenerate QR
              </Button>
              <Button size="sm" variant="destructive" onClick={handleLogout} style={{ marginTop: 8 }}>
                Logout
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>

      {qrFullscreen && qrDataUrl && (
        <div
          onClick={() => setQrFullscreen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <div style={{ background: '#fff', padding: 16, borderRadius: 12 }}>
            <img src={qrDataUrl} alt="QR Code" style={{ width: 320, height: 320, display: 'block' }} />
          </div>
        </div>
      )}
    </div>
  )
}
