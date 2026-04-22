'use client'

import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, CartesianGrid 
} from 'recharts'

const COLORS = ['#f97316', '#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#ec4899']

export function RegistrationChart({ data }: { data: any[] }) {
  if (!data?.length) return null
  return (
    <div className="chart-container">
      <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>User Registrations (Last 30 days)</h2>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
          <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} allowDecimals={false} />
          <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8 }} />
          <Line type="monotone" dataKey="count" stroke="#f97316" strokeWidth={2} dot={false} name="Registrations" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ConditionChart({ data }: { data: any[] }) {
  if (!data?.length) return null
  return (
    <div className="chart-container">
      <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Condition Distribution</h2>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
               label={({ name, percent }) => percent ? `${name.slice(0, 8)}: ${(percent * 100).toFixed(0)}%` : name}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export function AIRankChart({ data }: { data: any[] }) {
  if (!data?.length) return null
  return (
    <div className="chart-container">
      <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Daily Token Usage (14 days)</h2>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
          <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
          <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8 }} />
          <Line type="monotone" dataKey="tokens" stroke="#f97316" strokeWidth={2} dot={false} name="Tokens" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function AIFeatureChart({ data }: { data: any[] }) {
  if (!data?.length) return null
  return (
    <div className="chart-container">
      <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Calls by Feature</h2>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical">
          <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
          <YAxis dataKey="name" type="category" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={110} />
          <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8 }} />
          <Bar dataKey="count" fill="#22c55e" radius={[0, 4, 4, 0]} name="API Calls" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
