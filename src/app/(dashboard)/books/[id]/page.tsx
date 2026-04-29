'use client'

import { use } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRole } from '@/lib/context/RoleContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { ArrowLeft, BookOpen, Users, Building, Calendar } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { formatDate } from '@/lib/utils'

const COPY_STATUS_BADGE: Record<string, string> = {
  Available:   'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  Issued:      'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  Reserved:    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  Maintenance: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
}

const CONDITION_BADGE: Record<string, string> = {
  New:  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  Good: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  Fair: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  Poor: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

export default function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { role } = useRole()
  const qc = useQueryClient()
  const [reserveOpen, setReserveOpen] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['book', id],
    queryFn: async () => {
      const res = await fetch(`/api/books/${id}`)
      const json = await res.json()
      return json.data
    },
  })

  const { data: membersData } = useQuery({
    queryKey: ['members-list'],
    queryFn: async () => {
      const res = await fetch('/api/members?limit=100')
      const json = await res.json()
      return json.data ?? []
    },
    enabled: reserveOpen,
  })

  const handleReserve = async () => {
    if (!selectedMemberId) { toast.error('Select a member'); return }
    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ book_id: id, member_id: selectedMemberId }),
    })
    if (res.ok) {
      toast.success('Reservation created')
      setReserveOpen(false)
      qc.invalidateQueries({ queryKey: ['book', id] })
    } else {
      const err = await res.json()
      toast.error(err.error || 'Failed to create reservation')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!data) return <div>Book not found</div>

  const availableCopies = data.book_copy?.filter((c: { availability_status: string }) => c.availability_status === 'Available') ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/books">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Books
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Book Info */}
        <Card className="lg:col-span-2">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold">{data.title}</h1>
                <p className="text-muted-foreground text-sm mt-1">
                  {data.book_author?.map((ba: { author: { name: string } | null }) => ba.author?.name).filter(Boolean).join(', ')}
                </p>
              </div>
              <Badge className={availableCopies.length > 0 ? COPY_STATUS_BADGE.Available : COPY_STATUS_BADGE.Issued}>
                {availableCopies.length > 0 ? `${availableCopies.length} Available` : 'Not Available'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <BookOpen className="h-4 w-4 shrink-0" />
                <span className="font-medium text-foreground">Genre:</span> {data.genre}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building className="h-4 w-4 shrink-0" />
                <span className="font-medium text-foreground">Publisher:</span> {data.publisher || '—'}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4 shrink-0" />
                <span className="font-medium text-foreground">Year:</span> {data.year_published || '—'}
              </div>
              <div className="text-muted-foreground">
                <span className="font-medium text-foreground">Edition:</span> {data.edition || '—'}
              </div>
              <div className="col-span-2 font-mono text-xs text-muted-foreground">
                ISBN: {data.isbn}
              </div>
            </div>

            {/* Authors detail */}
            {data.book_author?.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2"><Users className="h-4 w-4" />Authors</h3>
                <div className="space-y-1">
                  {data.book_author.map((ba: { author: { author_id: string; name: string; nationality: string | null; bio: string | null } | null }) => ba.author && (
                    <div key={ba.author.author_id} className="text-sm">
                      <span className="font-medium">{ba.author.name}</span>
                      {ba.author.nationality && <span className="text-muted-foreground"> · {ba.author.nationality}</span>}
                      {ba.author.bio && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ba.author.bio}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Quick Actions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {availableCopies.length === 0 && (role === 'admin' || role === 'librarian') && (
                <Dialog open={reserveOpen} onOpenChange={setReserveOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full" size="sm">Create Reservation</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Reserve Book</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        All copies of <strong>{data.title}</strong> are currently unavailable.
                        Reserve for a member.
                      </p>
                      <div className="space-y-1">
                        <Label>Select Member</Label>
                        <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                          <SelectTrigger><SelectValue placeholder="Choose member..." /></SelectTrigger>
                          <SelectContent>
                            {membersData?.filter((m: { status: string }) => m.status === 'Active').map((m: { member_id: string; name: string; email: string }) => (
                              <SelectItem key={m.member_id} value={m.member_id}>
                                {m.name} — {m.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleReserve} className="w-full">Confirm Reservation</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              <div className="text-xs text-muted-foreground pt-1">
                <p>{data.book_copy?.length ?? 0} total copies in library</p>
                <p>{availableCopies.length} currently available</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Copies Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Physical Copies</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium text-xs uppercase tracking-wide">Copy ID</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium text-xs uppercase tracking-wide">Condition</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium text-xs uppercase tracking-wide">Status</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium text-xs uppercase tracking-wide">Shelf</th>
                </tr>
              </thead>
              <tbody>
                {data.book_copy?.map((copy: { copy_id: string; condition: string; availability_status: string; location_shelf: string | null }) => (
                  <tr key={copy.copy_id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="py-2 px-3 font-mono text-xs text-muted-foreground">{copy.copy_id.slice(0, 8)}…</td>
                    <td className="py-2 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${CONDITION_BADGE[copy.condition]}`}>
                        {copy.condition}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${COPY_STATUS_BADGE[copy.availability_status]}`}>
                        {copy.availability_status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">{copy.location_shelf || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
