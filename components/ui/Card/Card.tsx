import { forwardRef, type ComponentPropsWithoutRef, type ElementRef, type ReactNode } from 'react'
import styles from './Card.module.css'

interface CardProps extends ComponentPropsWithoutRef<'div'> {
  asChild?: boolean
}

const Card = forwardRef<ElementRef<'div'>, CardProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={[styles.card, className].filter(Boolean).join(' ')}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

interface CardHeaderProps extends ComponentPropsWithoutRef<'div'> {}

const CardHeader = forwardRef<ElementRef<'div'>, CardHeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={[styles.header, className].filter(Boolean).join(' ')}
        {...props}
      >
        {children}
      </div>
    )
  }
)

CardHeader.displayName = 'Card.Header'

interface CardBodyProps extends ComponentPropsWithoutRef<'div'> {}

const CardBody = forwardRef<ElementRef<'div'>, CardBodyProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={[styles.body, className].filter(Boolean).join(' ')}
        {...props}
      >
        {children}
      </div>
    )
  }
)

CardBody.displayName = 'Card.Body'

interface CardFooterProps extends ComponentPropsWithoutRef<'div'> {}

const CardFooter = forwardRef<ElementRef<'div'>, CardFooterProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={[styles.footer, className].filter(Boolean).join(' ')}
        {...props}
      >
        {children}
      </div>
    )
  }
)

CardFooter.displayName = 'Card.Footer'

export { Card, CardHeader, CardBody, CardFooter }
export type { CardProps, CardHeaderProps, CardBodyProps, CardFooterProps }
