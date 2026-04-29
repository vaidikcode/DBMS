'use client'

import { RoleSwitcher } from './RoleSwitcher'
import { ThemeToggle } from './ThemeToggle'
import { Library } from 'lucide-react'

interface TopBarProps {
  title?: string
}

export function TopBar({ title }: TopBarProps) {
  return (
    <header className="border-b border-border bg-card/80 backdrop-blur px-6 py-3 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-3 md:hidden">
        <Library className="h-5 w-5 text-primary" />
        <span className="font-semibold text-sm">Thapar Library</span>
      </div>
      {title && (
        <h1 className="hidden md:block text-base font-semibold">{title}</h1>
      )}
      <div className="flex items-center gap-2 ml-auto">
        <RoleSwitcher />
        <ThemeToggle />
      </div>
    </header>
  )
}
