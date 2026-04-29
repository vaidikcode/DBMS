'use client'

import { useRole } from '@/lib/context/RoleContext'
import type { MockRole } from '@/lib/constants'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UserCircle2, ChevronDown } from 'lucide-react'

const ROLES: { value: MockRole; label: string; description: string }[] = [
  { value: 'admin',     label: 'Admin',     description: 'Full system access' },
  { value: 'librarian', label: 'Librarian', description: 'Issue, return, manage fines' },
  { value: 'member',    label: 'Member',    description: 'Browse catalog, reserve books' },
]

const ROLE_COLORS: Record<MockRole, string> = {
  admin:     'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  librarian: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  member:    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
}

export function RoleSwitcher() {
  const { role, setRole } = useRole()
  const current = ROLES.find(r => r.value === role)!

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-8">
          <UserCircle2 className="h-3.5 w-3.5" />
          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${ROLE_COLORS[role]}`}>
            {current.label}
          </span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Switch role (demo mode)
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ROLES.map(r => (
          <DropdownMenuItem
            key={r.value}
            onClick={() => setRole(r.value)}
            className="flex flex-col items-start gap-0.5 cursor-pointer"
          >
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${ROLE_COLORS[r.value]}`}>
              {r.label}
            </span>
            <span className="text-xs text-muted-foreground">{r.description}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Missing DropdownMenu components — add to shadcn if not present
// This needs: npx shadcn@latest add dropdown-menu
