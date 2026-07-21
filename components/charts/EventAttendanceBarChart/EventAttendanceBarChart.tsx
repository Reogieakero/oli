'use client'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { chartColors } from '@/lib/chartColors'
import { ChartCard } from '../ChartCard/ChartCard'
import type { ReactNode } from 'react'

interface EventDataPoint {
  name: string
  presentRate: number
  present?: number
  late?: number
  absent?: number
}

interface EventAttendanceBarChartProps {
  data: EventDataPoint[]
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

export function EventAttendanceBarChart({
  data,
  loading,
  title = 'Attendance by Event',
  subtitle,
  actions,
  height = 240,
}: EventAttendanceBarChartProps) {
  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      actions={actions}
      loading={loading}
      empty={data.length === 0}
      emptyMessage="No events with attendance data."
    >
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout="horizontal"
          margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={chartColors.border}
            vertical={false}
          />
          <XAxis
            dataKey="name"
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
          <Bar
            dataKey="presentRate"
            name="Attendance Rate"
            fill={chartColors.primary}
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}