import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const status = searchParams.get('status') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = (page - 1) * limit

  const supabase = createAdminClient()

  let query = supabase
    .from('member')
    .select('*', { count: 'exact' })
    .order('name')
    .range(offset, offset + limit - 1)

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,mobile_no.ilike.%${search}%`)
  }
  if (status) {
    query = query.eq('status', status)
  }

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ data, total: count, page, limit })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('member')
    .insert(body)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ data }, { status: 201 })
}
