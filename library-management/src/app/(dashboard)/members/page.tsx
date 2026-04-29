'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Search, Plus, Users } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { MEMBERSHIP_TYPES } from '@/lib/constants'

const STATUS_BADGE: Record<string, string> = {
  Active:    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  Suspended: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  Expired:   'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
}

const TYPE_BADGE: Record<string, string> = {
  Student:  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  Faculty:  'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  Standard: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  Premium:  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
}

type Member = {
  member_id: string
  name: string
  email: string
  mobile_no: string
  membership_type: string
  join_date: string
  status: string
}

export default function MembersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [newMember, setNewMember] = useState({
    name: '', email: '', mobile_no: '', date_of_birth: '',
    membership_type: 'Student', join_date: new Date().toISOString().split('T')[0],
  })

  const { data, isLoading } = useQuery({
    queryKey: ['members', search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ search, status: statusFilter, limit: '100' })
      const res = await fetch(`/api/members?${params}`)
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'API error') }
      return res.json()
    },
  })

  const members: Member[] = data?.data ?? []

  const handleAddMember = async () => {
    if (!newMember.name || !newMember.email || !newMember.mobile_no) {
      toast.error('Name, email and mobile are required')
      return
    }
    const res = await fetch('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMember),
    })
    if (res.ok) {
      toast.success('Member added')
      setAddOpen(false)
      qc.invalidateQueries({ queryKey: ['members'] })
    } else {
      const err = await res.json()
      toast.error(err.error || 'Failed to add member')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Members</h1>
          <p className="text-sm text-muted-foreground">{data?.total ?? 0} total members</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="h-4 w-4" />Add Member</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Register New Member</DialogTitle></DialogHeader>
            <div className="space-y-3">
              {[
                { key: 'name', label: 'Full Name *', type: 'text' },
                { key: 'email', label: 'Email *', type: 'email' },
                { key: 'mobile_no', label: 'Mobile No *', type: 'tel' },
                { key: 'date_of_birth', label: 'Date of Birth', type: 'date' },
                { key: 'join_date', label: 'Join Date', type: 'date' },
              ].map(({ key, label, type }) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs">{label}</Label>
                  <Input
                    type={type}
                    value={newMember[key as keyof typeof newMember]}
                    onChange={e => setNewMember(p => ({ ...p, [key]: e.target.value }))}
                  />
                </div>
              ))}
              <div className="space-y-1">
                <Label className="text-xs">Membership Type</Label>
                <Select
                  value={newMember.membership_type}
                  onValueChange={v => setNewMember(p => ({ ...p, membership_type: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MEMBERSHIP_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddMember} className="w-full">Register Member</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or mobile..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Suspended">Suspended</SelectItem>
            <SelectItem value="Expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>No members found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wide">Name</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wide hidden md:table-cell">Email</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wide hidden sm:table-cell">Mobile</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wide">Type</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wide">Status</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wide hidden lg:table-cell">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(m => (
                    <tr key={m.member_id} className="border-b border-border last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <Link href={`/members/${m.member_id}`} className="font-medium hover:underline">
                          {m.name}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">{m.email}</td>
                      <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell">{m.mobile_no}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${TYPE_BADGE[m.membership_type]}`}>
                          {m.membership_type}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[m.status]}`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground hidden lg:table-cell">{formatDate(m.join_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
