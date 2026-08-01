'use client'

import { useEffect, useRef, useState } from 'react'
import { apiClient } from '@/lib/apiClient'
import { Spinner } from '@/components/ui/Spinner/Spinner'
import styles from './AvatarUploader.module.css'

interface AvatarUploaderProps {
  avatarUrl: string | null
  initials?: string
  onChange: (avatarUrl: string) => void
}

export function AvatarUploader({ avatarUrl, initials = '?', onChange }: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!avatarUrl) return
    let active = true
    apiClient<{ signedUrl: string }>(`/students/avatars/${encodeURIComponent(avatarUrl)}`, { authenticated: true })
      .then((res) => { if (active) setSignedUrl(res.signedUrl) })
      .catch(() => { if (active) setSignedUrl(null) })
    return () => { active = false }
  }, [avatarUrl])

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const body = new FormData()
      body.append('avatar', file)
      const res = await apiClient<{ avatarUrl: string }>('/students/me/avatar', { method: 'POST', body, authenticated: true })
      onChange(res.avatarUrl)
    } catch (err) {
      console.error(err)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.avatar}>
        {signedUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={signedUrl} alt="Profile" className={styles.img} />
        ) : (
          <span className={styles.initials}>{initials}</span>
        )}
        {uploading && (
          <div className={styles.overlay}>
            <Spinner />
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleFile} />
      <button type="button" className={styles.uploadBtn} onClick={() => inputRef.current?.click()} disabled={uploading}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
        {avatarUrl ? 'Change photo' : 'Upload photo'}
      </button>
    </div>
  )
}
