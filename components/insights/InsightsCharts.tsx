'use client'

import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts'

const COLORS = ['#f97316', '#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#ec4899']

export function ConditionCategoryChart({ data }: { data: any[] }) {
  if (!data?.length) return null
  return (
    <div className="chart-container">
      <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Top Condition Categories</h2>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} layout="vertical">
          <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
          <YAxis dataKey="name" type="category" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={120} />
          <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8 }} />
          <Bar dataKey="value" fill="#f97316" radius={[0, 4, 4, 0]} name="Contributions" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function StateDistributionChart({ data }: { data: any[] }) {
  if (!data?.length) return null
  return (
    <div className="chart-container">
      <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Contributions by State</h2>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data}>
          <XAxis dataKey="state" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} angle={-30} textAnchor="end" height={50} />
          <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
          <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8 }} />
          <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} name="Contributions" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function AgeDistributionChart({ data }: { data: any[] }) {
  if (!data?.length) return null
  return (
    <div className="chart-container">
      <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Age Range Distribution</h2>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="range" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => percent ? `${name}: ${(percent * 100).toFixed(0)}%` : name}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
