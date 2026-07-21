'use client'

import { useState, useCallback, useRef, useEffect, type ChangeEvent } from 'react'
import { Input, type InputSize } from '../Input/Input'
import styles from './SearchBar.module.css'

interface SearchBarProps {
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  placeholder?: string
  size?: InputSize
  disabled?: boolean
  className?: string
}

function SearchBar({
  value: controlledValue,
  defaultValue = '',
  onChange,
  placeholder = 'Search\u2026',
  size,
  disabled,
  className,
}: SearchBarProps) {
  const [internalValue, setInternalValue] = useState(defaultValue)
  const isControlled = controlledValue !== undefined
  const value = isControlled ? controlledValue : internalValue

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const debouncedOnChange = useCallback(
    (val: string) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        onChange?.(val)
      }, 300)
    },
    [onChange]
  )

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value
      if (!isControlled) setInternalValue(next)
      debouncedOnChange(next)
    },
    [isControlled, debouncedOnChange]
  )

  const handleClear = useCallback(() => {
    if (!isControlled) setInternalValue('')
    onChange?.('')
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [isControlled, onChange])

  const searchIcon = (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )

  const clearIcon = value ? (
    <button
      type="button"
      className={styles.clearBtn}
      onClick={handleClear}
      aria-label="Clear search"
    >
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
        <path d="M1 1L7 7M7 1L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    </button>
  ) : undefined

  return (
    <div className={[styles.wrapper, className].filter(Boolean).join(' ')}>
      <Input
        leadingIcon={searchIcon}
        trailingIcon={clearIcon}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        inputSize={size}
        disabled={disabled}
      />
    </div>
  )
}

SearchBar.displayName = 'SearchBar'

export { SearchBar }
export type { SearchBarProps }
