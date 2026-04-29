'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { formatDate, formatCurrency } from '@/lib/utils'
import { AlertCircle, CheckCircle2, DollarSign } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

const STATUS_BADGE: Record<string, string> = {
  Unpaid: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  Paid:   'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  Waived: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
}

type Fine = {
  fine_id: string
  issue_id: string
  amount: number
  fine_date: string
  payment_status: string
  payment_date: string | null
  issue?: {
    issue_date: string
    due_date: string
    return_date: string | null
    member_id: string
    member?: { name: string; email: string }
    book_copy?: { book?: { title: string; isbn: string } }
  }
}

export default function FinesPage() {
  const qc = useQueryClient()
  const [unpaidOnly, setUnpaidOnly] = useState(false)
  const [payDialog, setPayDialog] = useState<Fine | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['fines', unpaidOnly],
    queryFn: async () => {
      const params = new URLSearchParams(unpaidOnly ? { payment_status: 'Unpaid' } : {})
      const res = await fetch(`/api/fines?${params}`)
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'API error') }
      return (await res.json()).data ?? []
    },
  })

  const fines: Fine[] = data ?? []

  const totalUnpaid = fines.filter(f => f.payment_status === 'Unpaid').reduce((s, f) => s + f.amount, 0)
  const totalPaid = fines.filter(f => f.payment_status === 'Paid').reduce((s, f) => s + f.amount, 0)

  const handlePay = async () => {
    if (!payDialog) return
    const res = await fetch('/api/fines/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fine_id: payDialog.fine_id }),
    })
    if (res.ok) {
      toast.success('Fine paid successfully')
      setPayDialog(null)
      qc.invalidateQueries({ queryKey: ['fines'] })
    } else {
      const err = await res.json()
      toast.error(err.error || 'Failed to process payment')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fines Management</h1>
        <p className="text-sm text-muted-foreground">Overdue fine tracking and payment processing</p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Unpaid</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalUnpaid)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Collected</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Switch id="unpaid-only" checked={unpaidOnly} onCheckedChange={setUnpaidOnly} />
        <Label htmlFor="unpaid-only" className="text-sm">Show unpaid fines only</Label>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : fines.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>No fines found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">Member</th>
                    <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">Book</th>
                    <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium hidden sm:table-cell">Due Date</th>
                    <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">Amount</th>
                    <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium hidden md:table-cell">Payment Date</th>
                    <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {fines.map((fine) => (
                    <tr key={fine.fine_id} className={`border-b border-border last:border-0 hover:bg-muted/30 ${fine.payment_status === 'Unpaid' ? 'bg-red-50/30 dark:bg-red-900/5' : ''}`}>
                      <td className="py-3 px-4">
                        <p className="font-medium text-sm">{fine.issue?.member?.name || '—'}</p>
                        <p className="text-xs text-muted-foreground">{fine.issue?.member?.email}</p>
                      </td>
                      <td className="py-3 px-4 max-w-[160px]">
                        <p className="text-sm truncate">{fine.issue?.book_copy?.book?.title || '—'}</p>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell">
                        {formatDate(fine.issue?.due_date)}
                      </td>
                      <td className="py-3 px-4 font-semibold">
                        <span className={fine.payment_status === 'Unpaid' ? 'text-red-600' : 'text-green-600'}>
                          {formatCurrency(fine.amount)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[fine.payment_status]}`}>
                          {fine.payment_status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">
                        {formatDate(fine.payment_date)}
                      </td>
                      <td className="py-3 px-4">
                        {fine.payment_status === 'Unpaid' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs gap-1"
                            onClick={() => setPayDialog(fine)}
                          >
                            <DollarSign className="h-3 w-3" />
                            Pay
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

      {/* Pay Dialog */}
      <Dialog open={!!payDialog} onOpenChange={() => setPayDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Process Fine Payment</DialogTitle></DialogHeader>
          {payDialog && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted p-3 space-y-1 text-sm">
                <p><span className="text-muted-foreground">Member:</span> <strong>{payDialog.issue?.member?.name}</strong></p>
                <p><span className="text-muted-foreground">Book:</span> {payDialog.issue?.book_copy?.book?.title}</p>
                <p><span className="text-muted-foreground">Amount:</span> <strong className="text-red-600">{formatCurrency(payDialog.amount)}</strong></p>
              </div>
              <div className="text-xs font-mono bg-muted rounded p-2 text-muted-foreground">
                {`UPDATE fine SET payment_status = 'Paid', payment_date = CURRENT_DATE WHERE fine_id = '${payDialog.fine_id}';`}
                <br />
                {'-- Trigger: trg_after_fine_payment → reactivates member if no remaining fines'}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setPayDialog(null)} className="flex-1">Cancel</Button>
                <Button onClick={handlePay} className="flex-1">Confirm Payment</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
