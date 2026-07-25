'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import styles from './DatePicker.module.css'

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  className?: string
  placeholder?: string
  minDate?: string
}

function buildCalendarGrid(year: number, month: number): (number | null)[][] {
  const first = new Date(year, month, 1)
  const startDow = (first.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const weeks: (number | null)[][] = []
  let day = 1
  for (let w = 0; w < 6; w++) {
    if (day > daysInMonth) break
    const week: (number | null)[] = []
    for (let d = 0; d < 7; d++) {
      if ((w === 0 && d < startDow) || day > daysInMonth) {
        week.push(null)
      } else {
        week.push(day)
        day++
      }
    }
    weeks.push(week)
  }
  return weeks
}

function DatePicker({ value, onChange, className, placeholder = 'Select date', minDate }: DatePickerProps) {
  const [open, setOpen] = useState(false)

  const selected = value ? new Date(value + 'T00:00:00') : null
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }, [])
  const min = useMemo(() => minDate ? new Date(minDate + 'T00:00:00') : today, [minDate, today])

  const [viewYear, setViewYear] = useState(selected ? selected.getFullYear() : today.getFullYear())
  const [viewMonth, setViewMonth] = useState(selected ? selected.getMonth() : today.getMonth())

  const wrapperRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open && selected) {
      setViewYear(selected.getFullYear())
      setViewMonth(selected.getMonth())
    }
  }, [open, selected])

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

  const grid = useMemo(() => buildCalendarGrid(viewYear, viewMonth), [viewYear, viewMonth])

  const prevMonth = useCallback(() => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }, [viewMonth])

  const nextMonth = useCallback(() => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }, [viewMonth])

  const selectDay = useCallback((day: number) => {
    const d = new Date(viewYear, viewMonth, day)
    if (min && d < min) return
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    onChange(iso)
    setOpen(false)
    triggerRef.current?.focus()
  }, [viewYear, viewMonth, onChange, min])

  const selectedStr = selected ? `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, '0')}-${String(selected.getDate()).padStart(2, '0')}` : null
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const displayLabel = selected
    ? `${MONTHS[selected.getMonth()]} ${selected.getDate()}, ${selected.getFullYear()}`
    : placeholder

  const wrapperClass = [styles.wrapper, className].filter(Boolean).join(' ')

  return (
    <div ref={wrapperRef} className={wrapperClass}>
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={styles.icon}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M2 6.5h12" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M5.5 1.5V4M10.5 1.5V4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
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
        <div className={styles.panel} role="dialog" aria-label="Date picker">
          <div className={styles.nav}>
            <button type="button" className={styles.navBtn} onClick={prevMonth} aria-label="Previous month">
              <svg width="8" height="12" viewBox="0 0 8 12" fill="none">
                <path d="M6 1L1 6L6 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <span className={styles.navLabel}>{MONTHS[viewMonth]} {viewYear}</span>
            <button type="button" className={styles.navBtn} onClick={nextMonth} aria-label="Next month">
              <svg width="8" height="12" viewBox="0 0 8 12" fill="none">
                <path d="M2 1L7 6L2 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          <div className={styles.weekdays}>
            {WEEKDAYS.map(d => <span key={d} className={styles.weekday}>{d}</span>)}
          </div>

          <div className={styles.grid}>
            {grid.map((week, wi) =>
              <div key={wi} className={styles.gridRow}>
                {week.map((day, di) => {
                  if (day === null) return <div key={`${wi}-${di}`} className={styles.dayCell} />
                  const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const dateObj = new Date(viewYear, viewMonth, day)
                  const isSelected = dateStr === selectedStr
                  const isToday = dateStr === todayStr
                  const isDisabled = min && dateObj < min
                  return (
                    <button
                      key={`${wi}-${di}`}
                      type="button"
                      className={`${styles.dayBtn} ${isSelected ? styles.daySelected : ''} ${isToday ? styles.dayToday : ''} ${isDisabled ? styles.dayDisabled : ''}`}
                      onClick={() => selectDay(day)}
                      disabled={!!isDisabled}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

DatePicker.displayName = 'DatePicker'

export { DatePicker }
