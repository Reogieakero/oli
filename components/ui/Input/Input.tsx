import { forwardRef, type ComponentPropsWithoutRef, type ElementRef, type ReactNode } from 'react'
import styles from './Input.module.css'

type InputSize = 'sm' | 'md' | 'lg'

interface InputProps extends ComponentPropsWithoutRef<'input'> {
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
  inputSize?: InputSize
}

const Input = forwardRef<ElementRef<'input'>, InputProps>(
  ({ leadingIcon, trailingIcon, inputSize = 'md', disabled, className, ...props }, ref) => {
    const wrapperClass = [
      styles.wrapper,
      inputSize === 'sm' ? styles.wrapperSm : '',
      inputSize === 'lg' ? styles.wrapperLg : '',
      disabled ? styles.wrapperDisabled : '',
      className,
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <div className={wrapperClass}>
        {leadingIcon && <span className={styles.icon}>{leadingIcon}</span>}
        <input
          ref={ref}
          className={styles.input}
          disabled={disabled}
          {...props}
        />
        {trailingIcon && <span className={styles.icon}>{trailingIcon}</span>}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input, type InputSize }
