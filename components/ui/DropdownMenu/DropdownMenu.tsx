'use client'

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type KeyboardEvent,
  type ReactNode,
  type MouseEvent,
} from 'react'
import styles from './DropdownMenu.module.css'

interface MenuItemConfig {
  label?: string
  onClick?: () => void
  disabled?: boolean
  separator?: boolean
  icon?: ReactNode
}

interface DropdownMenuProps {
  trigger: ReactNode
  items: MenuItemConfig[]
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  align?: 'left' | 'right'
  className?: string
}

function DropdownMenu({
  trigger,
  items,
  isOpen: controlledOpen,
  onOpenChange,
  align = 'right',
  className,
}: DropdownMenuProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : internalOpen
  const [focusedIndex, setFocusedIndex] = useState(-1)

  const wrapperRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  const toggleOpen = useCallback(() => {
    const next = !isOpen
    if (!isControlled) setInternalOpen(next)
    onOpenChange?.(next)
  }, [isOpen, isControlled, onOpenChange])

  const close = useCallback(() => {
    if (!isControlled) setInternalOpen(false)
    onOpenChange?.(false)
    setFocusedIndex(-1)
  }, [isControlled, onOpenChange])

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent | Event) => {
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
  }, [isOpen, close])

  useEffect(() => {
    if (isOpen && focusedIndex >= 0) {
      itemRefs.current[focusedIndex]?.focus()
    }
  }, [isOpen, focusedIndex])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        const enabledIndices = items
          .map((item, i) => (item.disabled || item.separator ? -1 : i))
          .filter((i) => i >= 0)
        const currentPos = enabledIndices.indexOf(focusedIndex)
        const nextPos = currentPos < enabledIndices.length - 1 ? currentPos + 1 : 0
        setFocusedIndex(enabledIndices[nextPos])
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        const enabledIndices = items
          .map((item, i) => (item.disabled || item.separator ? -1 : i))
          .filter((i) => i >= 0)
        const currentPos = enabledIndices.indexOf(focusedIndex)
        const prevPos = currentPos > 0 ? currentPos - 1 : enabledIndices.length - 1
        setFocusedIndex(enabledIndices[prevPos])
      } else if (e.key === 'Enter' && focusedIndex >= 0) {
        e.preventDefault()
        items[focusedIndex]?.onClick?.()
        close()
      }
    },
    [items, focusedIndex, close]
  )

  const handleItemClick = useCallback(
    (item: MenuItemConfig) => {
      if (item.disabled) return
      item.onClick?.()
      close()
    },
    [close]
  )

  const visibleItems = items.filter((item) => !item.separator || true)

  const wrapperClass = [styles.wrapper, className].filter(Boolean).join(' ')

  return (
    <div ref={wrapperRef} className={wrapperClass}>
      <div
        className={styles.trigger}
        onClick={toggleOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            toggleOpen()
          }
        }}
        role="button"
        tabIndex={0}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        {trigger}
      </div>

      {isOpen && (
        <div
          ref={panelRef}
          className={[styles.panel, styles.panelOpen].join(' ')}
          role="menu"
          onKeyDown={handleKeyDown}
        >
          {items.map((item, i) => {
            if (item.separator) {
              return <div key={`sep-${i}`} className={styles.separator} role="separator" />
            }
            return (
              <button
                key={i}
                ref={(el) => { itemRefs.current[i] = el }}
                role="menuitem"
                className={[
                  styles.menuItem,
                  focusedIndex === i ? styles.menuItemFocused : '',
                  item.disabled ? styles.menuItemDisabled : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                disabled={item.disabled}
                onClick={() => handleItemClick(item)}
                onMouseEnter={() => setFocusedIndex(i)}
              >
                {item.icon && <span aria-hidden="true">{item.icon}</span>}
                {item.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

DropdownMenu.displayName = 'DropdownMenu'

export { DropdownMenu }
export type { MenuItemConfig, DropdownMenuProps }
