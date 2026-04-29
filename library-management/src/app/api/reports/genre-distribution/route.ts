import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createAdminClient()

  // Demonstrates: GROUP BY + COUNT aggregate function
  const { data, error } = await supabase
    .from('book')
    .select('genre')
    .order('genre')

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Count genres client-side (Supabase doesn't support GROUP BY directly in JS client)
  const counts: Record<string, number> = {}
  data?.forEach(row => {
    counts[row.genre] = (counts[row.genre] || 0) + 1
  })

  const result = Object.entries(counts)
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count)

  return NextResponse.json({ data: result })
}
