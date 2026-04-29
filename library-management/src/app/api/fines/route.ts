import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const paymentStatus = searchParams.get('payment_status') || ''
  const memberId = searchParams.get('member_id') || ''

  const supabase = createAdminClient()

  let query = supabase
    .from('fine')
    .select(`
      *,
      issue(
        issue_date, due_date, return_date, member_id,
        member(name, email),
        book_copy(book(title, isbn))
      )
    `)
    .order('created_at', { ascending: false })

  if (paymentStatus) query = query.eq('payment_status', paymentStatus)
  if (memberId) {
    // Filter by member through the nested issue relationship
    query = query.eq('issue.member_id', memberId)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ data })
}
