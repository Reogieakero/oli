'use client'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
} from 'recharts'
import { chartColors } from '@/lib/chartColors'
import { ChartCard } from '../ChartCard/ChartCard'
import type { ReactNode } from 'react'

interface BalanceDataPoint {
  name: string
  value: number
  color: string
}

interface BalanceStatusChartProps {
  data: BalanceDataPoint[]
  loading?: boolean
  title?: string
  subtitle?: string
  actions?: ReactNode
  compact?: boolean
  chartHeight?: number
}

const DEFAULT_COLORS: Record<string, string> = {
  Unpaid: chartColors.dark,
  Partial: chartColors.primary,
  Paid: chartColors.accent,
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

export function BalanceStatusChart({
  data,
  loading,
  title = 'Balance Status',
  subtitle,
  actions,
  compact,
  chartHeight = compact ? 160 : 240,
}: BalanceStatusChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    color: DEFAULT_COLORS[d.name] ?? d.color,
  }))

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      actions={actions}
      loading={loading}
      empty={data.every((d) => d.value === 0)}
      emptyMessage="No balance records."
      compact={compact}
    >
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 4, bottom: compact ? 20 : 4, left: 0 }}
        >
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: chartColors.mutedText }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 13, fill: chartColors.mutedText }}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} cursor={false} />
          <Legend
            wrapperStyle={{ fontSize: 13, paddingTop: 8 }}
            iconType="circle"
            iconSize={8}
          />
          <Bar dataKey="value" name="Count" radius={[0, 4, 4, 0]} maxBarSize={24}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}