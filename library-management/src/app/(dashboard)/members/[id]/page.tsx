'use client'

import { use } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { formatDate, formatCurrency } from '@/lib/utils'
import { ArrowLeft, User, Mail, Phone, Calendar, BookOpen, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

const STATUS_COLORS: Record<string, string> = {
  Active:    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  Suspended: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  Expired:   'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
}

const FINE_STATUS: Record<string, string> = {
  Unpaid: 'text-red-600 dark:text-red-400',
  Paid:   'text-green-600 dark:text-green-400',
  Waived: 'text-gray-500',
}

export default function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const qc = useQueryClient()

  const { data: report, isLoading } = useQuery({
    queryKey: ['member-report', id],
    queryFn: async () => {
      const res = await fetch(`/api/members/${id}`)
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'API error') }
      const json = await res.json()
      return json.data ?? null
    },
  })

  const handlePayFine = async (fineId: string) => {
    const res = await fetch('/api/fines/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fine_id: fineId }),
    })
    if (res.ok) {
      toast.success('Fine marked as paid')
      qc.invalidateQueries({ queryKey: ['member-report', id] })
    } else {
      const err = await res.json()
      toast.error(err.error || 'Failed to process payment')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!report) return <div className="text-muted-foreground">Member not found</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/members">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Members
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[report.status]}`}>
                {report.status}
              </span>
            </div>
            <div>
              <h2 className="font-bold text-lg">{report.name}</h2>
              <p className="text-sm text-muted-foreground">{report.membership_type} Member</p>
            </div>
            <Separator />
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{report.email}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <span>Joined {formatDate(report.join_date)}</span>
              </div>
            </div>
            <Separator />
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 text-center">
              <div>
                <p className="text-2xl font-bold">{report.total_borrowed}</p>
                <p className="text-xs text-muted-foreground">Total Borrowed</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{report.active_issues}</p>
                <p className="text-xs text-muted-foreground">Active Issues</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(report.fines_paid)}</p>
                <p className="text-xs text-muted-foreground">Fines Paid</p>
              </div>
              <div>
                <p className={`text-2xl font-bold ${report.fines_pending > 0 ? 'text-red-600' : ''}`}>
                  {formatCurrency(report.fines_pending)}
                </p>
                <p className="text-xs text-muted-foreground">Fines Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* History */}
        <div className="lg:col-span-2 space-y-4">
          {/* Borrowing History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <BookOpen className="h-4 w-4" /> Borrowing History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!report.borrowing_history?.length ? (
                <p className="text-sm text-muted-foreground px-4 pb-4">No borrowing history</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left py-2 px-4 text-xs text-muted-foreground font-medium">Book</th>
                        <th className="text-left py-2 px-4 text-xs text-muted-foreground font-medium hidden sm:table-cell">Issue Date</th>
                        <th className="text-left py-2 px-4 text-xs text-muted-foreground font-medium">Due Date</th>
                        <th className="text-left py-2 px-4 text-xs text-muted-foreground font-medium">Status</th>
                        <th className="text-left py-2 px-4 text-xs text-muted-foreground font-medium">Fine</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.borrowing_history.map((h: {
                        issue_id: string
                        book_title: string
                        issue_date: string
                        due_date: string
                        return_date: string | null
                        status: string
                        fine_amount: number
                        fine_status: string | null
                      }) => (
                        <tr key={h.issue_id} className="border-b border-border last:border-0 hover:bg-muted/30">
                          <td className="py-2 px-4 font-medium max-w-[180px]">
                            <p className="truncate text-xs">{h.book_title}</p>
                          </td>
                          <td className="py-2 px-4 text-muted-foreground hidden sm:table-cell">{formatDate(h.issue_date)}</td>
                          <td className="py-2 px-4 text-muted-foreground">{formatDate(h.due_date)}</td>
                          <td className="py-2 px-4">
                            <span className={`text-xs font-medium ${h.status === 'Active' ? 'text-blue-600' : h.status === 'Returned' ? 'text-green-600' : 'text-red-600'}`}>
                              {h.status}
                            </span>
                          </td>
                          <td className="py-2 px-4">
                            {h.fine_amount > 0 ? (
                              <span className={`text-xs font-medium ${FINE_STATUS[h.fine_status ?? 'Unpaid']}`}>
                                {formatCurrency(h.fine_amount)}
                              </span>
                            ) : <span className="text-xs text-muted-foreground">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Reservations */}
          {report.active_reservations?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" /> Active Reservations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {report.active_reservations.map((r: {
                    reservation_id: string
                    book_title: string
                    reservation_date: string
                    expiry_date: string
                  }) => (
                    <div key={r.reservation_id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <p className="text-sm font-medium">{r.book_title}</p>
                      <p className="text-xs text-muted-foreground">Expires {formatDate(r.expiry_date)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
