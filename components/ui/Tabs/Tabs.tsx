'use client'

import { useState, useCallback, type KeyboardEvent, type ReactNode } from 'react'
import styles from './Tabs.module.css'

interface Tab {
  id: string
  label: string
  disabled?: boolean
}

interface TabsProps {
  tabs: Tab[]
  activeId?: string
  onChange?: (id: string) => void
  className?: string
}

function Tabs({ tabs, activeId: controlledId, onChange, className }: TabsProps) {
  const [internalId, setInternalId] = useState(tabs[0]?.id ?? '')
  const isControlled = controlledId !== undefined
  const activeId = isControlled ? controlledId : internalId

  const handleClick = useCallback(
    (id: string) => {
      if (!isControlled) setInternalId(id)
      onChange?.(id)
    },
    [isControlled, onChange]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const currentIndex = tabs.findIndex((t) => t.id === activeId)
      let nextIndex: number | null = null

      if (e.key === 'ArrowRight') {
        nextIndex = tabs.findIndex((t, i) => i > currentIndex && !t.disabled)
      } else if (e.key === 'ArrowLeft') {
        const reversed = [...tabs].reverse()
        const reversedIndex = reversed.findIndex(
          (t, i) => tabs.length - 1 - i < currentIndex && !t.disabled
        )
        nextIndex = reversedIndex >= 0 ? tabs.length - 1 - reversedIndex : null
      } else {
        return
      }

      if (nextIndex !== null && nextIndex >= 0 && nextIndex < tabs.length) {
        e.preventDefault()
        handleClick(tabs[nextIndex].id)
      }
    },
    [tabs, activeId, handleClick]
  )

  const classes = [styles.tabs, className].filter(Boolean).join(' ')

  return (
    <div className={classes} role="tablist" onKeyDown={handleKeyDown}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={tab.id === activeId}
          aria-disabled={tab.disabled}
          tabIndex={tab.id === activeId ? 0 : -1}
          className={[
            styles.tab,
            tab.id === activeId ? styles.activeTab : '',
            tab.disabled ? styles.tabDisabled : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={() => handleClick(tab.id)}
          disabled={tab.disabled}
        >
          {tab.label}
          {tab.id === activeId && (
            <span className={styles.indicator} />
          )}
        </button>
      ))}
    </div>
  )
}

Tabs.displayName = 'Tabs'

export { Tabs }
export type { Tab }
