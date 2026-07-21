'use client'

import { useState, useCallback } from 'react'
import { Button } from '../Button/Button'
import { Badge } from '../Badge/Badge'
import styles from './Filter.module.css'

interface FilterOption {
  id: string
  label: string
  checked: boolean
}

interface FilterProps {
  options: FilterOption[]
  onChange?: (options: FilterOption[]) => void
  label?: string
  className?: string
}

function Filter({ options: externalOptions, onChange, label = 'Filter', className }: FilterProps) {
  const [internalOptions, setInternalOptions] = useState<FilterOption[]>(
    externalOptions.map((o) => ({ ...o }))
  )
  const [isOpen, setIsOpen] = useState(false)

  const isControlled = externalOptions !== undefined
  const options = isControlled ? externalOptions : internalOptions

  const activeCount = options.filter((o) => o.checked).length

  const toggleOption = useCallback(
    (id: string) => {
      const next = options.map((o) =>
        o.id === id ? { ...o, checked: !o.checked } : o
      )
      if (!isControlled) setInternalOptions(next)
      onChange?.(next)
    },
    [options, isControlled, onChange]
  )

  const trigger = (
    <span className={styles.triggerBtn}>
      {label}
      {activeCount > 0 && <Badge variant="brand">{activeCount}</Badge>}
    </span>
  )

  return (
    <div className={[styles.filterPanel, className].filter(Boolean).join(' ')}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {trigger}
      </Button>

      {isOpen && (
        <div
          className={styles.filterPanel}
          role="menu"
        >
          {options.map((option) => (
            <div
              key={option.id}
              className={styles.filterOption}
              role="menuitemcheckbox"
              aria-checked={option.checked}
              onClick={() => toggleOption(option.id)}
            >
              <input
                type="checkbox"
                checked={option.checked}
                onChange={() => toggleOption(option.id)}
                tabIndex={-1}
                aria-hidden="true"
              />
              <span className={styles.filterLabel}>{option.label}</span>
              <span className={styles.filterCount}>
                {option.checked ? 'ON' : 'OFF'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

Filter.displayName = 'Filter'

export { Filter }
export type { FilterOption, FilterProps }
