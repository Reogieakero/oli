'use client'

import { useState, useCallback, useRef, useEffect, createContext, useContext, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import styles from './Toast.module.css'

type ToastVariant = 'success' | 'warning' | 'error' | 'info'

interface ToastData {
  id: string
  message: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

interface ToastContextValue {
  toast: (data: Omit<ToastData, 'id'>) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

// --- Individual Toast Item ---
interface ToastItemProps {
  data: ToastData
  onClose: (id: string) => void
}

function ToastItem({ data, onClose }: ToastItemProps) {
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    if (data.duration === Infinity) return
    const timer = setTimeout(() => {
      setExiting(true)
      setTimeout(() => onClose(data.id), 150)
    }, data.duration ?? 4000)
    return () => clearTimeout(timer)
  }, [data, onClose])

  const handleDismiss = useCallback(() => {
    setExiting(true)
    setTimeout(() => onClose(data.id), 150)
  }, [data.id, onClose])

  const variant = data.variant ?? 'info'

  const toastClass = [
    styles.toast,
    styles[variant],
    exiting ? styles.toastExiting : '',
  ]
    .filter(Boolean)
    .join(' ')

  const iconMap: Record<ToastVariant, ReactNode> = {
    success: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="7" stroke="var(--color-status-success)" strokeWidth="1.5"/>
        <path d="M5 8L7 10L11 6" stroke="var(--color-status-success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    warning: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="7" stroke="var(--color-status-warning)" strokeWidth="1.5"/>
        <path d="M8 5V8.5M8 10.5V10.51" stroke="var(--color-status-warning)" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    error: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="7" stroke="var(--color-status-danger)" strokeWidth="1.5"/>
        <path d="M5.5 5.5L10.5 10.5M10.5 5.5L5.5 10.5" stroke="var(--color-status-danger)" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    info: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="7" stroke="var(--color-brand-accent)" strokeWidth="1.5"/>
        <path d="M8 7.5V11M8 5.5V5.51" stroke="var(--color-brand-accent)" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  }

  return (
    <div
      className={toastClass}
      role="alert"
      aria-live="assertive"
    >
      <span className={styles.icon}>{iconMap[variant]}</span>
      <div className={styles.content}>
        <div className={styles.message}>{data.message}</div>
        {data.description && (
          <div className={styles.description}>{data.description}</div>
        )}
      </div>
      <button
        className={styles.closeBtn}
        onClick={handleDismiss}
        aria-label="Dismiss notification"
        type="button"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="M1.5 1.5L8.5 8.5M8.5 1.5L1.5 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  )
}

// --- Provider ---
let toastCounter = 0

interface ToastProviderProps {
  children: ReactNode
}

function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastData[]>([])

  const toast = useCallback((data: Omit<ToastData, 'id'>) => {
    const id = `toast-${++toastCounter}`
    setToasts((prev) => [...prev, { ...data, id }])
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      {typeof document !== 'undefined' && createPortal(
        <div className={styles.container} aria-label="Notifications">
          {toasts.map((t) => (
            <ToastItem key={t.id} data={t} onClose={dismiss} />
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}

export { ToastProvider, useToast }
export type { ToastData, ToastVariant }
