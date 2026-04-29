import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const genre = searchParams.get('genre') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = (page - 1) * limit

  const supabase = createAdminClient()

  let query = supabase
    .from('book')
    .select(`
      *,
      book_author(author_id, author(name)),
      book_copy(copy_id, availability_status, condition, location_shelf)
    `, { count: 'exact' })
    .order('title')
    .range(offset, offset + limit - 1)

  if (search) {
    query = query.or(`title.ilike.%${search}%,isbn.ilike.%${search}%`)
  }
  if (genre) {
    query = query.eq('genre', genre)
  }

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const books = data?.map(b => ({
    ...b,
    authors: b.book_author?.map((ba: { author: { name: string } | null }) => ba.author?.name).filter(Boolean).join(', '),
    available_copies: b.book_copy?.filter((c: { availability_status: string }) => c.availability_status === 'Available').length ?? 0,
    total_copies: b.book_copy?.length ?? 0,
  }))

  return NextResponse.json({ data: books, total: count, page, limit })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const supabase = createAdminClient()

  const { author_ids, ...bookData } = body

  const { data: book, error } = await supabase
    .from('book')
    .insert(bookData)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (author_ids?.length) {
    const relations = author_ids.map((id: string) => ({ book_id: book.book_id, author_id: id }))
    await supabase.from('book_author').insert(relations)
  }

  return NextResponse.json({ data: book }, { status: 201 })
}
