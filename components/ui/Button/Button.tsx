import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react'
import styles from './Button.module.css'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant?: ButtonVariant
  size?: ButtonSize
  iconOnly?: boolean
}

const Button = forwardRef<ElementRef<'button'>, ButtonProps>(
  ({ variant = 'primary', size = 'md', iconOnly = false, className, children, ...props }, ref) => {
    const classNames = [
      styles.btn,
      styles[variant],
      styles[size],
      iconOnly ? styles.iconOnly : '',
      className,
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <button ref={ref} className={classNames} {...props}>
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button, type ButtonVariant, type ButtonSize }
