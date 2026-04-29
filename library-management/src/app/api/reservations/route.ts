import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { RESERVATION_EXPIRY_DAYS } from '@/lib/constants'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || ''
  const memberId = searchParams.get('member_id') || ''

  const supabase = createAdminClient()

  let query = supabase
    .from('reservation')
    .select(`
      *,
      book(title, isbn, genre),
      member(name, email)
    `)
    .order('reservation_date', { ascending: false })

  if (status) query = query.eq('status', status)
  if (memberId) query = query.eq('member_id', memberId)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ data })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { book_id, member_id } = body

  if (!book_id || !member_id) {
    return NextResponse.json({ error: 'book_id and member_id are required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const expiryDate = new Date()
  expiryDate.setDate(expiryDate.getDate() + RESERVATION_EXPIRY_DAYS)

  const { data, error } = await supabase
    .from('reservation')
    .insert({
      book_id,
      member_id,
      reservation_date: new Date().toISOString().split('T')[0],
      expiry_date: expiryDate.toISOString().split('T')[0],
      status: 'Pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ data }, { status: 201 })
}
