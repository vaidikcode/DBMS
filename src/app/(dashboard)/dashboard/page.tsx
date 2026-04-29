'use client'

import { useQuery } from '@tanstack/react-query'
import { StatCard } from '@/components/dashboard/StatCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatCurrency } from '@/lib/utils'
import {
  BookOpen, Users, BookCopy, AlertCircle,
  TrendingUp, Clock, CheckCircle2, DollarSign,
} from 'lucide-react'

export default function DashboardPage() {
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const res = await fetch('/api/reports/stats')
      if (!res.ok) throw new Error('Failed to load stats')
      const json = await res.json()
      return json.data as {
        total_books: number; available_copies: number; total_copies: number
        total_active_members: number; total_members: number; active_issues: number
        overdue_count: number; pending_reservations: number
        fines_collected: number; fines_pending: number
      } | null
    },
  })

  const { data: overdueData } = useQuery({
    queryKey: ['overdue'],
    queryFn: async () => {
      const res = await fetch('/api/issues?status=Active')
      if (!res.ok) throw new Error('Failed to load issues')
      const json = await res.json()
      return (json.data ?? []) as Array<{
        issue_id: string; due_date: string
        member?: { name: string }
        book_copy?: { book?: { title: string } }
        return_date: string | null; status: string; issue_date: string
      }>
    },
  })

  const { data: recentData } = useQuery({
    queryKey: ['recent-issues'],
    queryFn: async () => {
      const res = await fetch('/api/issues?limit=10')
      if (!res.ok) throw new Error('Failed to load recent issues')
      const json = await res.json()
      return (json.data ?? []) as Array<{
        issue_id: string; status: string; due_date: string
        member?: { name: string }
        book_copy?: { book?: { title: string } }
        issue_date: string; return_date: string | null
      }>
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Library Dashboard</h1>
        <p className="text-muted-foreground text-sm">Thapar Institute of Engineering and Technology</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-12 w-full" /></CardContent></Card>
          ))
        ) : (
          <>
            <StatCard
              title="Total Books"
              value={statsData?.total_books ?? 0}
              subtitle={`${statsData?.available_copies ?? 0} available copies`}
              icon={BookOpen}
            />
            <StatCard
              title="Active Members"
              value={statsData?.total_active_members ?? 0}
              subtitle={`${statsData?.total_members ?? 0} total members`}
              icon={Users}
            />
            <StatCard
              title="Books Issued"
              value={statsData?.active_issues ?? 0}
              subtitle={`${statsData?.overdue_count ?? 0} overdue`}
              icon={BookCopy}
              className={(statsData?.overdue_count ?? 0) > 0 ? 'border-orange-200 dark:border-orange-900' : ''}
            />
            <StatCard
              title="Fines Pending"
              value={formatCurrency(statsData?.fines_pending ?? 0)}
              subtitle={`${formatCurrency(statsData?.fines_collected ?? 0)} collected`}
              icon={DollarSign}
              className={(statsData?.fines_pending ?? 0) > 0 ? 'border-red-200 dark:border-red-900' : ''}
            />
          </>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Overdue Alert */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-4 w-4 text-red-500" />
              Overdue Books
              {(overdueData?.length ?? 0) > 0 && (
                <Badge variant="destructive" className="ml-auto">{overdueData!.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!overdueData?.length ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                No overdue books right now
              </div>
            ) : (
              <div className="space-y-2">
                {overdueData.slice(0, 5).map((issue: {
                  issue_id: string
                  member?: { name: string }
                  book_copy?: { book?: { title: string } }
                  due_date: string
                }) => (
                  <div key={issue.issue_id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{issue.member?.name}</p>
                      <p className="text-xs text-muted-foreground">{issue.book_copy?.book?.title}</p>
                    </div>
                    <Badge variant="destructive" className="text-xs shrink-0">
                      Due {formatDate(issue.due_date)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentData?.slice(0, 6).map((issue: {
                issue_id: string
                status: string
                member?: { name: string }
                book_copy?: { book?: { title: string } }
                issue_date: string
                return_date: string | null
              }) => (
                <div key={issue.issue_id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{issue.member?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{issue.book_copy?.book?.title}</p>
                  </div>
                  <div className="text-right ml-2 shrink-0">
                    <Badge
                      variant={issue.status === 'Returned' ? 'secondary' : issue.status === 'Active' ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {issue.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(issue.return_date ?? issue.issue_date)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional stats row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium">Pending Reservations</p>
              <p className="text-2xl font-bold">{statsData?.pending_reservations ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium">Total Copies</p>
              <p className="text-2xl font-bold">{statsData?.total_copies ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-medium">Fines Collected</p>
              <p className="text-2xl font-bold">{formatCurrency(statsData?.fines_collected ?? 0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DBMS Info */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2 items-center text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">DBMS Stack:</span>
            {['PostgreSQL (Supabase)', 'PL/pgSQL Functions', '3NF Schema (9 tables)', 'Triggers (3)', 'Views (5)', 'Next.js 14'].map(t => (
              <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
