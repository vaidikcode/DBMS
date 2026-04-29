import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { fine_id } = body

  if (!fine_id) {
    return NextResponse.json({ error: 'fine_id is required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('fine')
    .update({
      payment_status: 'Paid',
      payment_date: new Date().toISOString().split('T')[0],
    })
    .eq('fine_id', fine_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ data })
}
