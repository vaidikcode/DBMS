'use client'

import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRole } from '@/lib/context/RoleContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Search, Plus, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { GENRES } from '@/lib/constants'

const AVAILABILITY_BADGE: Record<string, string> = {
  Available:   'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  Issued:      'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  Reserved:    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  Maintenance: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
}

export default function BooksPage() {
  const { role } = useRole()
  const qc = useQueryClient()

  const [search, setSearch] = useState('')
  const [genre, setGenre] = useState('')
  const [page, setPage] = useState(1)
  const [addOpen, setAddOpen] = useState(false)
  const [newBook, setNewBook] = useState({
    title: '', isbn: '', genre: '', publisher: '', edition: '',
    year_published: '', authors: '',
  })

  const queryKey = ['books', search, genre, page]

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({ search, genre, page: String(page), limit: '20' })
      const res = await fetch(`/api/books?${params}`)
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'API error') }
      return res.json()
    },
  })

  const books = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 20)

  const handleAddBook = async () => {
    const res = await fetch('/api/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newBook,
        year_published: newBook.year_published ? parseInt(newBook.year_published) : null,
      }),
    })
    if (res.ok) {
      toast.success('Book added successfully')
      setAddOpen(false)
      setNewBook({ title: '', isbn: '', genre: '', publisher: '', edition: '', year_published: '', authors: '' })
      qc.invalidateQueries({ queryKey: ['books'] })
    } else {
      const err = await res.json()
      toast.error(err.error || 'Failed to add book')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Book Catalog</h1>
          <p className="text-sm text-muted-foreground">{total} books in collection</p>
        </div>
        {(role === 'admin' || role === 'librarian') && (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Book
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Book</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                {[
                  { key: 'title', label: 'Title *' },
                  { key: 'isbn', label: 'ISBN *' },
                  { key: 'publisher', label: 'Publisher' },
                  { key: 'edition', label: 'Edition' },
                  { key: 'year_published', label: 'Year Published' },
                  { key: 'authors', label: 'Author(s) (comma separated)' },
                ].map(({ key, label }) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs">{label}</Label>
                    <Input
                      value={newBook[key as keyof typeof newBook]}
                      onChange={e => setNewBook(p => ({ ...p, [key]: e.target.value }))}
                    />
                  </div>
                ))}
                <div className="space-y-1">
                  <Label className="text-xs">Genre *</Label>
                  <Select value={newBook.genre} onValueChange={v => setNewBook(p => ({ ...p, genre: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select genre" /></SelectTrigger>
                    <SelectContent>
                      {GENRES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddBook} className="w-full">Add Book</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or ISBN..."
            className="pl-9"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <Select value={genre} onValueChange={v => { setGenre(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Genres" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Genres</SelectItem>
            {GENRES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Books Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No books found</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {books.map((book: {
            book_id: string
            title: string
            authors: string | null
            genre: string
            isbn: string
            year_published: number | null
            publisher: string | null
            available_copies: number
            total_copies: number
          }) => (
            <Link key={book.book_id} href={`/books/${book.book_id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm leading-snug line-clamp-2">{book.title}</h3>
                    <Badge
                      className={`shrink-0 text-xs ${book.available_copies > 0
                        ? AVAILABILITY_BADGE.Available
                        : AVAILABILITY_BADGE.Issued}`}
                    >
                      {book.available_copies > 0 ? `${book.available_copies} avail.` : 'None available'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{book.authors || 'Unknown author'}</p>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">{book.genre}</Badge>
                    <span className="text-xs text-muted-foreground">{book.year_published}</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">ISBN: {book.isbn}</p>
                  <p className="text-xs text-muted-foreground">{book.total_copies} total cop{book.total_copies === 1 ? 'y' : 'ies'}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
