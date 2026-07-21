import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react'
import styles from './Badge.module.css'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'brand'

interface BadgeProps extends ComponentPropsWithoutRef<'span'> {
  variant?: BadgeVariant
}

const Badge = forwardRef<ElementRef<'span'>, BadgeProps>(
  ({ variant = 'brand', className, children, ...props }, ref) => {
    const classNames = [styles.badge, styles[variant], className]
      .filter(Boolean)
      .join(' ')

    return (
      <span ref={ref} className={classNames} {...props}>
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

export { Badge, type BadgeVariant }
