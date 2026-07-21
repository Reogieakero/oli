'use client'

import { useCallback, type ReactNode } from 'react'
import { Checkbox } from '../Checkbox/Checkbox'
import { Pagination } from '../Pagination/Pagination'
import styles from './DataTable.module.css'

export interface Column<T> {
  key: string
  header: string
  sortable?: boolean
  render?: (row: T) => ReactNode
  width?: string
}

export interface SortState {
  key: string
  direction: 'asc' | 'desc'
}

export interface PaginationState {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  getRowId: (row: T) => string
  selectable?: boolean
  selectedIds?: Set<string>
  onSelectionChange?: (ids: Set<string>) => void
  sortState?: SortState | null
  onSortChange?: (sort: SortState | null) => void
  pagination?: PaginationState
  loading?: boolean
  emptyState?: ReactNode
  onRowClick?: (row: T) => void
  className?: string
}

const SKELETON_ROWS = 8

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  getRowId,
  selectable,
  selectedIds = new Set(),
  onSelectionChange,
  sortState,
  onSortChange,
  pagination,
  loading,
  emptyState,
  onRowClick,
  className,
}: DataTableProps<T>) {
  const allSelected = data.length > 0 && data.every((r) => selectedIds.has(getRowId(r)))
  const someSelected = !allSelected && data.some((r) => selectedIds.has(getRowId(r)))

  const handleSelectAll = useCallback(() => {
    if (!onSelectionChange) return
    if (allSelected) {
      const next = new Set(selectedIds)
      data.forEach((r) => next.delete(getRowId(r)))
      onSelectionChange(next)
    } else {
      const next = new Set(selectedIds)
      data.forEach((r) => next.add(getRowId(r)))
      onSelectionChange(next)
    }
  }, [data, getRowId, selectedIds, allSelected, onSelectionChange])

  const handleSelectRow = useCallback(
    (id: string) => {
      if (!onSelectionChange) return
      const next = new Set(selectedIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      onSelectionChange(next)
    },
    [selectedIds, onSelectionChange]
  )

  const handleSort = useCallback(
    (key: string) => {
      if (!onSortChange) return
      if (sortState?.key === key) {
        if (sortState.direction === 'asc') {
          onSortChange({ key, direction: 'desc' })
        } else {
          onSortChange(null)
        }
      } else {
        onSortChange({ key, direction: 'asc' })
      }
    },
    [sortState, onSortChange]
  )

  const renderSortArrow = (key: string) => {
    if (sortState?.key !== key) {
      return <span className={styles.sortArrow}>↕</span>
    }
    return (
      <span className={`${styles.sortArrow} ${styles.sortArrowActive}`}>
        {sortState.direction === 'asc' ? '↑' : '↓'}
      </span>
    )
  }

  const wrapperClass = [styles.wrapper, className].filter(Boolean).join(' ')

  return (
    <div className={wrapperClass}>
      <table className={styles.table}>
        <thead>
          <tr className={styles.headerRow}>
            {selectable && (
              <th className={`${styles.headerCell} ${styles.checkboxCell}`}>
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={handleSelectAll}
                  aria-label="Select all rows"
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                className={`${styles.headerCell} ${col.sortable ? styles.headerCellSortable : ''}`}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.header}
                {col.sortable && renderSortArrow(col.key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: SKELETON_ROWS }).map((_, i) => (
              <tr key={`skeleton-${i}`} className={styles.loadingRow}>
                {selectable && <td className={`${styles.bodyCell} ${styles.checkboxCell}`} />}
                {columns.map((col) => (
                  <td key={col.key} className={styles.bodyCell}>
                    <div
                      className={styles.skeleton}
                      style={{ width: `${40 + Math.random() * 40}%` }}
                    />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (selectable ? 1 : 0)}
                className={styles.empty}
              >
                {emptyState || (
                  <span>No results found.</span>
                )}
              </td>
            </tr>
          ) : (
            data.map((row) => {
              const id = getRowId(row)
              const isSelected = selectedIds.has(id)
              const rowClass = [
                styles.bodyRow,
                isSelected ? styles.bodyRowSelected : '',
                onRowClick ? styles.bodyRowClickable : '',
              ]
                .filter(Boolean)
                .join(' ')

              return (
                <tr
                  key={id}
                  className={rowClass}
                  onClick={() => onRowClick?.(row)}
                >
                  {selectable && (
                    <td className={`${styles.bodyCell} ${styles.checkboxCell}`}>
                      <Checkbox
                        checked={isSelected}
                        onChange={() => handleSelectRow(id)}
                        aria-label="Select row"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className={styles.bodyCell}>
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              )
            })
          )}
        </tbody>
      </table>

      {pagination && !loading && data.length > 0 && (
        <div className={styles.footer}>
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.pageCount}
            onPageChange={pagination.onPageChange}
          />
        </div>
      )}
    </div>
  )
}