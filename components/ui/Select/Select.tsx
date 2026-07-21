import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react'
import styles from './Select.module.css'

type SelectSize = 'sm' | 'md' | 'lg'

interface SelectProps extends ComponentPropsWithoutRef<'select'> {
  selectSize?: SelectSize
}

const Select = forwardRef<ElementRef<'select'>, SelectProps>(
  ({ selectSize = 'md', className, children, ...props }, ref) => {
    const selectClass = [
      styles.select,
      selectSize === 'sm' ? styles.selectSm : '',
      selectSize === 'lg' ? styles.selectLg : '',
      className,
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <div className={styles.wrapper}>
        <select ref={ref} className={selectClass} {...props}>
          {children}
        </select>
        <span className={styles.chevron} aria-hidden="true">
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
            <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </div>
    )
  }
)

Select.displayName = 'Select'

export { Select, type SelectSize }
