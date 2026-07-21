'use client'

import { forwardRef, useRef, useEffect, type ComponentPropsWithoutRef, type ElementRef } from 'react'
import styles from './Checkbox.module.css'

interface CheckboxProps extends Omit<ComponentPropsWithoutRef<'input'>, 'type' | 'size'> {
  indeterminate?: boolean
}

const Checkbox = forwardRef<ElementRef<'input'>, CheckboxProps>(
  ({ indeterminate = false, disabled, className, children, ...props }, forwardedRef) => {
    const internalRef = useRef<HTMLInputElement>(null)
    const ref = (forwardedRef || internalRef) as React.RefObject<HTMLInputElement | null>

    useEffect(() => {
      if (ref && 'current' in ref && ref.current) {
        ref.current.indeterminate = indeterminate
      }
    }, [indeterminate, ref])

    const labelClass = [styles.label, disabled ? styles.labelDisabled : '', className]
      .filter(Boolean)
      .join(' ')

    return (
      <label className={labelClass}>
        <input
          ref={forwardedRef || internalRef}
          type="checkbox"
          className={styles.input}
          disabled={disabled}
          {...props}
        />
        <span className={styles.visual} aria-hidden="true">
          <svg className={styles.checkIcon} width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <svg className={styles.indeterminateIcon} width="8" height="2" viewBox="0 0 8 2" fill="none">
            <path d="M1 1H7" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </span>
        {children}
      </label>
    )
  }
)

Checkbox.displayName = 'Checkbox'

export { Checkbox }
