import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createAdminClient()

  // Last 12 weeks of borrowing data
  const twelveWeeksAgo = new Date()
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84)

  const { data, error } = await supabase
    .from('issue')
    .select('issue_date')
    .gte('issue_date', twelveWeeksAgo.toISOString().split('T')[0])
    .order('issue_date')

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Group by week
  const weekCounts: Record<string, number> = {}
  data?.forEach(row => {
    const d = new Date(row.issue_date)
    // Round down to Monday
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    d.setDate(diff)
    const weekKey = d.toISOString().split('T')[0]
    weekCounts[weekKey] = (weekCounts[weekKey] || 0) + 1
  })

  const result = Object.entries(weekCounts)
    .map(([week, count]) => ({
      week,
      label: new Date(week).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      count,
    }))
    .sort((a, b) => a.week.localeCompare(b.week))

  return NextResponse.json({ data: result })
}
