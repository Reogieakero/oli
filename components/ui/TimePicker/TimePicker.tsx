'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import styles from './TimePicker.module.css'

interface TimePickerProps {
  value: string
  onChange: (value: string) => void
  className?: string
  placeholder?: string
  minTime?: string
}

function generateTimes(): string[] {
  const times: string[] = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return times
}

function TimePicker({ value, onChange, className, placeholder = 'Select time', minTime }: TimePickerProps) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const times = useMemo(() => generateTimes(), [])

  useEffect(() => {
    if (!open) return
    const handleOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const handleEscape = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); triggerRef.current?.focus() }
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  useEffect(() => {
    if (open && value && listRef.current) {
      const selected = listRef.current.querySelector(`[data-value="${value}"]`)
      if (selected) {
        selected.scrollIntoView({ block: 'center', behavior: 'auto' })
      }
    }
  }, [open, value])

  const selectTime = useCallback((time: string) => {
    onChange(time)
    setOpen(false)
    triggerRef.current?.focus()
  }, [onChange])

  const displayLabel = value || placeholder

  const wrapperClass = [styles.wrapper, className].filter(Boolean).join(' ')

  return (
    <div ref={wrapperRef} className={wrapperClass}>
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={styles.icon}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M8 5v3.5l2.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
        <span className={styles.value}>{displayLabel}</span>
        <span className={styles.chevron} aria-hidden="true">
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
            <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </button>

      {open && (
        <div ref={listRef} className={styles.panel} role="listbox">
          {times.map(t => {
            const isSelected = t === value
            const isDisabled = minTime && t < minTime
            return (
              <button
                key={t}
                type="button"
                role="option"
                aria-selected={isSelected}
                data-value={t}
                className={`${styles.item} ${isSelected ? styles.itemSelected : ''} ${isDisabled ? styles.itemDisabled : ''}`}
                onClick={() => !isDisabled && selectTime(t)}
                disabled={!!isDisabled}
              >
                {t}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

TimePicker.displayName = 'TimePicker'

export { TimePicker }
