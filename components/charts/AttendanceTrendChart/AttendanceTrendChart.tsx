'use client'

import { useId } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { chartColors } from '@/lib/chartColors'
import { ChartCard } from '../ChartCard/ChartCard'
import type { ReactNode } from 'react'

interface TrendDataPoint {
  date: string
  presentRate: number
  present?: number
  late?: number
  absent?: number
  total?: number
}

interface AttendanceTrendChartProps {
  data: TrendDataPoint[]
  loading?: boolean
  title?: string
  subtitle?: string
  actions?: ReactNode
  height?: number
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
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
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value}%
        </div>
      ))}
    </div>
  )
}

export function AttendanceTrendChart({
  data,
  loading,
  title = 'Attendance Trend',
  subtitle,
  actions,
  height = 240,
}: AttendanceTrendChartProps) {
  const gradientId = useId()

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      actions={actions}
      loading={loading}
      empty={data.length === 0}
      emptyMessage="No attendance records for this period."
    >
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.12} />
              <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={chartColors.border}
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: chartColors.mutedText }}
            axisLine={{ stroke: chartColors.border, strokeWidth: 1 }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: chartColors.mutedText }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 13, paddingTop: 8 }}
            iconType="circle"
            iconSize={8}
          />
          <Area
            type="monotone"
            dataKey="presentRate"
            name="Attendance Rate"
            stroke={chartColors.primary}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            fillOpacity={1}
            dot={{ r: 3, fill: chartColors.primary, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: chartColors.primary, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}