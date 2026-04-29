import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { issue_id } = body

  if (!issue_id) {
    return NextResponse.json({ error: 'issue_id is required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase.rpc('return_book', {
    p_issue_id: issue_id,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ data })
}
