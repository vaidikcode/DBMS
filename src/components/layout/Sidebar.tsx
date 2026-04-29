'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useRole } from '@/lib/context/RoleContext'
import {
  BookOpen, Users, BookCopy, Calendar, AlertCircle,
  BarChart3, LayoutDashboard, Library,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard',     label: 'Dashboard',    icon: LayoutDashboard, roles: ['admin', 'librarian', 'member'] },
  { href: '/books',         label: 'Books',        icon: BookOpen,        roles: ['admin', 'librarian', 'member'] },
  { href: '/members',       label: 'Members',      icon: Users,           roles: ['admin', 'librarian'] },
  { href: '/issues',        label: 'Issues',       icon: BookCopy,        roles: ['admin', 'librarian'] },
  { href: '/reservations',  label: 'Reservations', icon: Calendar,        roles: ['admin', 'librarian', 'member'] },
  { href: '/fines',         label: 'Fines',        icon: AlertCircle,     roles: ['admin', 'librarian'] },
  { href: '/reports',       label: 'Reports',      icon: BarChart3,       roles: ['admin', 'librarian'] },
]

export function Sidebar() {
  const pathname = usePathname()
  const { role } = useRole()

  const visible = navItems.filter(item => item.roles.includes(role))

  return (
    <aside className="hidden md:flex flex-col w-60 border-r border-border bg-card min-h-screen">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-border">
        <Library className="h-6 w-6 text-primary" />
        <div>
          <p className="font-bold text-sm leading-tight">Thapar Library</p>
          <p className="text-xs text-muted-foreground">Management System</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {visible.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-6 py-4 border-t border-border">
        <p className="text-xs text-muted-foreground">DBMS Project · UCS310</p>
        <p className="text-xs text-muted-foreground">BTech 2nd Year · TIET</p>
      </div>
    </aside>
  )
}
