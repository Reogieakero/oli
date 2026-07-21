'use client'

import { useCallback, type KeyboardEvent } from 'react'
import styles from './Pagination.module.css'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const pages: (number | 'ellipsis')[] = [1]

  if (current > 3) pages.push('ellipsis')

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  if (current < total - 2) pages.push('ellipsis')

  pages.push(total)

  return pages
}

function Pagination({ currentPage, totalPages, onPageChange, className }: PaginationProps) {
  const handlePrev = useCallback(() => {
    if (currentPage > 1) onPageChange(currentPage - 1)
  }, [currentPage, onPageChange])

  const handleNext = useCallback(() => {
    if (currentPage < totalPages) onPageChange(currentPage + 1)
  }, [currentPage, totalPages, onPageChange])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>, page: number) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onPageChange(page)
      }
    },
    [onPageChange]
  )

  if (totalPages <= 1) return null

  const pageNumbers = getPageNumbers(currentPage, totalPages)
  const wrapperClass = [styles.wrapper, className].filter(Boolean).join(' ')

  return (
    <nav className={wrapperClass} aria-label="Pagination">
      <span className={styles.srOnly}>Page {currentPage} of {totalPages}</span>

      <button
        className={styles.navBtn}
        onClick={handlePrev}
        disabled={currentPage <= 1}
        aria-label="Previous page"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M7.5 2.5L4 6L7.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {pageNumbers.map((page, i) => {
        if (page === 'ellipsis') {
          return (
            <span key={`ellipsis-${i}`} className={styles.ellipsis} aria-hidden="true">
              &hellip;
            </span>
          )
        }

        const isActive = page === currentPage
        return (
          <button
            key={page}
            className={[styles.pageBtn, isActive ? styles.activePage : '']
              .filter(Boolean)
              .join(' ')}
            onClick={() => onPageChange(page)}
            onKeyDown={(e) => handleKeyDown(e, page)}
            aria-current={isActive ? 'page' : undefined}
            aria-label={`Page ${page}`}
            tabIndex={0}
          >
            {page}
          </button>
        )
      })}

      <button
        className={styles.navBtn}
        onClick={handleNext}
        disabled={currentPage >= totalPages}
        aria-label="Next page"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </nav>
  )
}

Pagination.displayName = 'Pagination'

export { Pagination }
