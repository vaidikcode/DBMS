'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { formatDate, formatCurrency, isOverdue } from '@/lib/utils'
import { Plus, RotateCcw, Search, AlertCircle, Code2 } from 'lucide-react'

type IssueRecord = {
  issue_id: string
  copy_id: string
  member_id: string
  staff_id: string
  issue_date: string
  due_date: string
  return_date: string | null
  status: string
  member?: { name: string; email: string; membership_type: string }
  book_copy?: { book?: { title: string; isbn: string }; location_shelf: string | null }
  fine?: { fine_id: string; amount: number; payment_status: string }[] | null
}

export default function IssuesPage() {
  const qc = useQueryClient()

  // Issue book state
  const [issueOpen, setIssueOpen] = useState(false)
  const [issueForm, setIssueForm] = useState({ copy_id: '', member_id: '', staff_id: '' })
  const [issueSqlVisible, setIssueSqlVisible] = useState(false)

  // Return state
  const [returnOpen, setReturnOpen] = useState(false)
  const [returnIssueId, setReturnIssueId] = useState('')
  const [returnPreview, setReturnPreview] = useState<{ fine_amount: number; fine_id: string | null } | null>(null)

  const [searchTerm, setSearchTerm] = useState('')

  const { data: activeData, isLoading: activeLoading } = useQuery({
    queryKey: ['issues', 'active'],
    queryFn: async () => {
      const res = await fetch('/api/issues?status=Active&limit=100')
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'API error') }
      return (await res.json()).data ?? []
    },
  })

  const { data: allData, isLoading: allLoading } = useQuery({
    queryKey: ['issues', 'all'],
    queryFn: async () => {
      const res = await fetch('/api/issues?limit=50')
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'API error') }
      return (await res.json()).data ?? []
    },
  })

  const { data: membersData } = useQuery({
    queryKey: ['members-for-issue'],
    queryFn: async () => {
      const res = await fetch('/api/members?limit=200')
      if (!res.ok) throw new Error('Failed to load members')
      return (await res.json()).data ?? []
    },
    enabled: issueOpen,
  })

  const { data: staffData } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const supabase = await import('@/lib/supabase/client').then(m => m.createClient())
      const { data } = await supabase.from('staff').select('*')
      return data ?? []
    },
    enabled: issueOpen,
  })

  const filterIssues = (issues: IssueRecord[]) =>
    issues?.filter(i =>
      !searchTerm ||
      i.member?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.book_copy?.book?.title?.toLowerCase().includes(searchTerm.toLowerCase())
    ) ?? []

  const handleIssueBook = async () => {
    if (!issueForm.copy_id || !issueForm.member_id || !issueForm.staff_id) {
      toast.error('All fields required')
      return
    }
    const res = await fetch('/api/issues/issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(issueForm),
    })
    if (res.ok) {
      toast.success('Book issued successfully')
      setIssueOpen(false)
      setIssueForm({ copy_id: '', member_id: '', staff_id: '' })
      qc.invalidateQueries({ queryKey: ['issues'] })
    } else {
      const err = await res.json()
      toast.error(err.error || 'Failed to issue book')
    }
  }

  const openReturn = (issue: IssueRecord) => {
    setReturnIssueId(issue.issue_id)
    const daysOverdue = Math.max(0, Math.round((new Date().getTime() - new Date(issue.due_date).getTime()) / 86400000))
    setReturnPreview({ fine_amount: daysOverdue * 5, fine_id: null })
    setReturnOpen(true)
  }

  const handleReturn = async () => {
    const res = await fetch('/api/issues/return', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issue_id: returnIssueId }),
    })
    if (res.ok) {
      const result = await res.json()
      const fine = result.data?.fine_amount
      if (fine > 0) {
        toast.warning(`Book returned. Fine applied: ${formatCurrency(fine)}`)
      } else {
        toast.success('Book returned successfully')
      }
      setReturnOpen(false)
      qc.invalidateQueries({ queryKey: ['issues'] })
      qc.invalidateQueries({ queryKey: ['fines'] })
    } else {
      const err = await res.json()
      toast.error(err.error || 'Failed to process return')
    }
  }

  const activeIssues = filterIssues(activeData ?? [])
  const allIssues = filterIssues(allData ?? [])
  const overdueIssues = activeIssues.filter(i => isOverdue(i.due_date))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Book Issues</h1>
          <p className="text-sm text-muted-foreground">
            {activeIssues.length} active · {overdueIssues.length} overdue
          </p>
        </div>
        <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="h-4 w-4" />Issue Book</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Issue Book to Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Member *</Label>
                <Select value={issueForm.member_id} onValueChange={v => setIssueForm(p => ({ ...p, member_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select member..." /></SelectTrigger>
                  <SelectContent>
                    {membersData?.filter((m: { status: string }) => m.status === 'Active').map((m: { member_id: string; name: string; email: string }) => (
                      <SelectItem key={m.member_id} value={m.member_id}>{m.name} — {m.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Copy ID *</Label>
                <Input
                  placeholder="Enter book copy UUID..."
                  value={issueForm.copy_id}
                  onChange={e => setIssueForm(p => ({ ...p, copy_id: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Find copy IDs on the Book detail page</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Processed by (Staff) *</Label>
                <Select value={issueForm.staff_id} onValueChange={v => setIssueForm(p => ({ ...p, staff_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select staff..." /></SelectTrigger>
                  <SelectContent>
                    {staffData?.map((s: { staff_id: string; name: string; role: string }) => (
                      <SelectItem key={s.staff_id} value={s.staff_id}>{s.name} ({s.role})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* SQL Transparency */}
              <div className="rounded-md border border-border">
                <button
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-muted-foreground"
                  onClick={() => setIssueSqlVisible(!issueSqlVisible)}
                >
                  <Code2 className="h-3 w-3" />
                  View database operation
                </button>
                {issueSqlVisible && (
                  <div className="px-3 pb-3">
                    <pre className="text-xs bg-muted p-2 rounded font-mono overflow-x-auto">
{`-- Calls stored procedure issue_book()
SELECT issue_book(
  '${issueForm.copy_id || '<copy_id>'}',
  '${issueForm.member_id || '<member_id>'}',
  '${issueForm.staff_id || '<staff_id>'}'
);

-- Trigger fires automatically:
-- trg_after_issue_insert → UPDATE book_copy
--   SET availability_status = 'Issued'`}
                    </pre>
                  </div>
                )}
              </div>

              <Button onClick={handleIssueBook} className="w-full">Issue Book</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by member or book..."
          className="pl-9"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">
            Active {activeIssues.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{activeIssues.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="overdue">
            Overdue {overdueIssues.length > 0 && <Badge variant="destructive" className="ml-1 text-xs">{overdueIssues.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="all">All History</TabsTrigger>
        </TabsList>

        {(['active', 'overdue', 'all'] as const).map(tab => {
          const issues = tab === 'active' ? activeIssues : tab === 'overdue' ? overdueIssues : allIssues
          const loading = tab === 'all' ? allLoading : activeLoading
          return (
            <TabsContent key={tab} value={tab}>
              <Card>
                <CardContent className="p-0">
                  {loading ? (
                    <div className="p-6 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
                  ) : issues.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p>No {tab} issues found</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/30">
                            <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">Member</th>
                            <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">Book</th>
                            <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium hidden sm:table-cell">Issue Date</th>
                            <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">Due Date</th>
                            <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">Status</th>
                            {tab !== 'all' && <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">Action</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {issues.map((issue: IssueRecord) => {
                            const overdue = isOverdue(issue.due_date) && issue.status === 'Active'
                            const daysLeft = Math.round((new Date(issue.due_date).getTime() - new Date().getTime()) / 86400000)
                            return (
                              <tr key={issue.issue_id} className={`border-b border-border last:border-0 hover:bg-muted/30 ${overdue ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                                <td className="py-3 px-4">
                                  <p className="font-medium text-sm">{issue.member?.name}</p>
                                  <p className="text-xs text-muted-foreground">{issue.member?.membership_type}</p>
                                </td>
                                <td className="py-3 px-4 max-w-[160px]">
                                  <p className="text-sm truncate">{issue.book_copy?.book?.title}</p>
                                  <p className="text-xs text-muted-foreground">{issue.book_copy?.location_shelf}</p>
                                </td>
                                <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell">{formatDate(issue.issue_date)}</td>
                                <td className="py-3 px-4">
                                  <p className={`text-sm ${overdue ? 'text-red-600 font-medium' : daysLeft <= 3 ? 'text-orange-600' : ''}`}>
                                    {formatDate(issue.due_date)}
                                  </p>
                                  {issue.status === 'Active' && (
                                    <p className={`text-xs ${overdue ? 'text-red-500' : 'text-muted-foreground'}`}>
                                      {overdue ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                                    </p>
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`text-xs font-medium ${issue.status === 'Active' && !overdue ? 'text-blue-600' : issue.status === 'Returned' ? 'text-green-600' : 'text-red-600'}`}>
                                    {issue.status}
                                  </span>
                                </td>
                                {tab !== 'all' && (
                                  <td className="py-3 px-4">
                                    {issue.status === 'Active' && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-1 text-xs"
                                        onClick={() => openReturn(issue)}
                                      >
                                        <RotateCcw className="h-3 w-3" />
                                        Return
                                      </Button>
                                    )}
                                  </td>
                                )}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )
        })}
      </Tabs>

      {/* Return Dialog */}
      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Process Book Return</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {returnPreview && returnPreview.fine_amount > 0 && (
              <div className="rounded-md bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <p className="text-sm font-medium text-orange-800 dark:text-orange-400">
                    Overdue Fine: {formatCurrency(returnPreview.fine_amount)}
                  </p>
                </div>
                <p className="text-xs text-orange-700 dark:text-orange-500 mt-1">
                  Fine will be automatically calculated and recorded
                </p>
              </div>
            )}
            <div className="rounded-md border border-border p-3">
              <p className="text-xs text-muted-foreground font-mono">
                {`SELECT return_book('${returnIssueId}');`}
                <br />
                <span className="text-muted-foreground/70">{'-- Trigger: trg_after_return_update fires'}</span>
                <br />
                <span className="text-muted-foreground/70">{'-- → UPDATE book_copy SET availability_status = \'Available\''}</span>
                <br />
                <span className="text-muted-foreground/70">{'-- → PERFORM process_reservation_queue(book_id)'}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setReturnOpen(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleReturn} className="flex-1">Confirm Return</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
