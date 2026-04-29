import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || ''
  const memberId = searchParams.get('member_id') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = (page - 1) * limit

  const supabase = createAdminClient()

  let query = supabase
    .from('issue')
    .select(`
      *,
      book_copy(book_id, location_shelf, condition, book(title, isbn, genre)),
      member(name, email, membership_type),
      staff(name),
      fine(fine_id, amount, payment_status)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)
  if (memberId) query = query.eq('member_id', memberId)

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ data, total: count, page, limit })
}
