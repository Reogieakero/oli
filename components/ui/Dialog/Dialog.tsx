'use client'

import {
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'
import { createPortal } from 'react-dom'
import styles from './Dialog.module.css'

interface DialogProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  className?: string
  bodyClassName?: string
  fullscreen?: boolean
  position?: 'center' | 'right'
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

function Dialog({ open, onClose, title, children, footer, className, bodyClassName, fullscreen, position = 'center' }: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement
      // Focus first focusable element inside dialog on next frame
      requestAnimationFrame(() => {
        const dialog = dialogRef.current
        if (!dialog) return
        const first = dialog.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
        first?.focus()
      })
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus()
      previousFocusRef.current = null
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleEscape = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onClose])

  const handleOverlayClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose()
    },
    [onClose]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'Tab') return
      const dialog = dialogRef.current
      if (!dialog) return

      const focusables = dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      if (focusables.length === 0) {
        e.preventDefault()
        return
      }

      const first = focusables[0]
      const last = focusables[focusables.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    },
    []
  )

  if (!open) return null

    const dialogContent = (
      <div
        className={[
          styles.overlay, 
          fullscreen ? styles.overlayFullscreen : null,
          position === 'right' ? styles.overlayRight : null
        ].filter(Boolean).join(' ')}
        onClick={handleOverlayClick}
        role="presentation"
      >
        <div
          ref={dialogRef}
          className={[
            styles.dialog, 
            fullscreen ? styles.dialogFullscreen : null, 
            position === 'right' ? styles.dialogRight : null,
            className
          ].filter(Boolean).join(' ')}
          role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        onKeyDown={handleKeyDown}
      >
        <div className={styles.header}>
          {title && (typeof title === 'string' ? <h2 className={styles.title}>{title}</h2> : title)}
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close dialog"
            type="button"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {children && <div className={[styles.body, bodyClassName].filter(Boolean).join(' ')}>{children}</div>}

        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(dialogContent, document.body)
}

Dialog.displayName = 'Dialog'

export { Dialog }
