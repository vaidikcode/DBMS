'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import { Calendar, X } from 'lucide-react'

const STATUS_BADGE: Record<string, string> = {
  Pending:   'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  Fulfilled: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  Cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  Expired:   'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

type Reservation = {
  reservation_id: string
  book_id: string
  member_id: string
  reservation_date: string
  expiry_date: string
  status: string
  book?: { title: string; isbn: string; genre: string }
  member?: { name: string; email: string }
}

export default function ReservationsPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('Pending')

  const { data, isLoading } = useQuery({
    queryKey: ['reservations', tab],
    queryFn: async () => {
      const params = new URLSearchParams(tab !== 'All' ? { status: tab } : {})
      const res = await fetch(`/api/reservations?${params}`)
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'API error') }
      return (await res.json()).data ?? []
    },
  })

  const handleCancel = async (id: string) => {
    const res = await fetch(`/api/reservations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Cancelled' }),
    })
    if (res.ok) {
      toast.success('Reservation cancelled')
      qc.invalidateQueries({ queryKey: ['reservations'] })
    } else {
      toast.error('Failed to cancel reservation')
    }
  }

  const reservations: Reservation[] = data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reservations</h1>
        <p className="text-sm text-muted-foreground">Book reservation queue management</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {['Pending', 'Fulfilled', 'Cancelled', 'All'].map(t => (
            <TabsTrigger key={t} value={t}>{t}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={tab}>
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : reservations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No {tab.toLowerCase()} reservations</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">Book</th>
                        <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">Member</th>
                        <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium hidden sm:table-cell">Reserved On</th>
                        <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">Expires</th>
                        <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">Status</th>
                        <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reservations.map((r) => (
                        <tr key={r.reservation_id} className="border-b border-border last:border-0 hover:bg-muted/30">
                          <td className="py-3 px-4">
                            <p className="font-medium text-sm">{r.book?.title}</p>
                            <p className="text-xs text-muted-foreground">{r.book?.genre}</p>
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-sm">{r.member?.name}</p>
                            <p className="text-xs text-muted-foreground">{r.member?.email}</p>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell">{formatDate(r.reservation_date)}</td>
                          <td className="py-3 px-4 text-muted-foreground">{formatDate(r.expiry_date)}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[r.status]}`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {r.status === 'Pending' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
                                onClick={() => handleCancel(r.reservation_id)}
                              >
                                <X className="h-3 w-3" />
                                Cancel
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
