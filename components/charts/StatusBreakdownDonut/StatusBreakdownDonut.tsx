'use client'

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts'
import { chartColors } from '@/lib/chartColors'
import { ChartCard } from '../ChartCard/ChartCard'
import type { ReactNode } from 'react'

interface StatusDataPoint {
  name: string
  value: number
  color: string
}

interface StatusBreakdownDonutProps {
  data: StatusDataPoint[]
  total: number
  loading?: boolean
  title?: string
  subtitle?: string
  actions?: ReactNode
  compact?: boolean
  chartHeight?: number
}

const DEFAULT_COLORS: Record<string, string> = {
  Present: chartColors.primary,
  Late: chartColors.accent,
  Absent: chartColors.dark,
  Pending: chartColors.light,
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div
      style={{
        background: 'var(--color-neutral-0)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-control)',
        padding: '8px 12px',
        fontSize: 13,
        lineHeight: 1.5,
      }}
    >
      <div style={{ color: d.color, fontWeight: 600 }}>
        {d.name}: {d.value}
      </div>
    </div>
  )
}

export function StatusBreakdownDonut({
  data,
  total,
  loading,
  title = 'Attendance Status',
  subtitle,
  actions,
  compact,
  chartHeight = compact ? 150 : 240,
}: StatusBreakdownDonutProps) {
  const chartData = data.map((d) => ({
    ...d,
    color: DEFAULT_COLORS[d.name] ?? d.color,
  }))

  const innerR = compact ? 34 : 60
  const outerR = compact ? 50 : 90

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      actions={actions}
      loading={loading}
      empty={total === 0}
      emptyMessage="No attendance records yet."
      compact={compact}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 8 : 16 }}>
        {total > 0 && (
          <div style={{ flexShrink: 0, textAlign: 'center', minWidth: compact ? 50 : 64 }}>
            <div
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: compact ? 22 : 28,
                fontWeight: 700,
                lineHeight: 1,
                color: 'var(--color-neutral-900)',
              }}
            >
              {total}
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--color-muted-fg)',
                marginTop: 2,
              }}
            >
              Total
            </div>
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={innerR}
                outerRadius={outerR}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 16,
              marginTop: 8,
              fontSize: 13,
            }}
          >
            {chartData.map((d) => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: d.color,
                    display: 'inline-block',
                  }}
                />
                <span style={{ color: 'var(--color-muted-fg)' }}>{d.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ChartCard>
  )
}