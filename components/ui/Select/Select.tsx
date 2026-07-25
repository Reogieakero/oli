'use client'

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type KeyboardEvent,
} from 'react'
import styles from './Select.module.css'

type SelectSize = 'sm' | 'md' | 'lg'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onChange: (e: { target: { value: string } }) => void
  options: SelectOption[]
  className?: string
  placeholder?: string
  selectSize?: SelectSize
  disabled?: boolean
  loading?: boolean
}

function Select({
  value,
  onChange,
  options,
  className,
  placeholder = 'Select...',
  selectSize = 'md',
  disabled,
  loading,
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  const selectedLabel =
    options.find((o) => o.value === value)?.label ?? placeholder

  const close = useCallback(() => {
    setOpen(false)
    setFocusedIndex(-1)
  }, [])

  const toggle = useCallback(() => {
    if (disabled) return
    setOpen((prev) => !prev)
    setFocusedIndex(-1)
  }, [disabled])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        close()
      }
    }
    const handleEscape = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open, close])

  useEffect(() => {
    if (open && focusedIndex >= 0) {
      itemRefs.current[focusedIndex]?.focus()
    }
  }, [open, focusedIndex])

  const selectOption = useCallback(
    (optValue: string) => {
      onChange({ target: { value: optValue } })
      close()
      triggerRef.current?.focus()
    },
    [onChange, close]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (!open) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
          e.preventDefault()
          toggle()
        }
        return
      }

      const enabledIndices = options
        .map((o, i) => (o.value !== undefined ? i : -1))
        .filter((i) => i >= 0)

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        const currentPos = enabledIndices.indexOf(focusedIndex)
        const nextPos = currentPos < enabledIndices.length - 1 ? currentPos + 1 : 0
        setFocusedIndex(enabledIndices[nextPos])
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        const currentPos = enabledIndices.indexOf(focusedIndex)
        const prevPos = currentPos > 0 ? currentPos - 1 : enabledIndices.length - 1
        setFocusedIndex(enabledIndices[prevPos])
      } else if (e.key === 'Enter' && focusedIndex >= 0) {
        e.preventDefault()
        selectOption(options[focusedIndex].value)
      }
    },
    [open, focusedIndex, options, toggle, selectOption]
  )

  const wrapperClass = [styles.wrapper, className].filter(Boolean).join(' ')
  const triggerClass = [
    styles.trigger,
    selectSize === 'sm' ? styles.triggerSm : '',
    selectSize === 'lg' ? styles.triggerLg : '',
    open ? styles.triggerOpen : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div ref={wrapperRef} className={wrapperClass} onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        className={triggerClass}
        onClick={toggle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={styles.value}>{selectedLabel}</span>
        <span className={styles.chevron} aria-hidden="true">
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
            <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </button>

      {open && (
        <div className={styles.panel} role="listbox">
          {options.map((opt, i) => {
            const isSelected = opt.value === value
            return (
              <button
                key={opt.value}
                ref={(el) => { itemRefs.current[i] = el }}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={[
                  styles.item,
                  isSelected ? styles.itemSelected : '',
                  focusedIndex === i ? styles.itemFocused : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => selectOption(opt.value)}
                onMouseEnter={() => setFocusedIndex(i)}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

Select.displayName = 'Select'

export { Select, type SelectSize, type SelectOption }
