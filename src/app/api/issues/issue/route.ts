import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { copy_id, member_id, staff_id } = body

  if (!copy_id || !member_id || !staff_id) {
    return NextResponse.json(
      { error: 'copy_id, member_id, and staff_id are required' },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase.rpc('issue_book', {
    p_copy_id: copy_id,
    p_member_id: member_id,
    p_staff_id: staff_id,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ data: { issue_id: data } }, { status: 201 })
}
