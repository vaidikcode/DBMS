import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export async function apiFetch(url: string): Promise<unknown> {
  const res = await fetch(url)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `API error ${res.status}`)
  }
  const json = await res.json()
  return json.data ?? null
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export function formatCurrency(amount: number): string {
  return `₹${amount.toFixed(2)}`
}

export function daysFromNow(dateStr: string): number {
  const target = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function isOverdue(dueDateStr: string): boolean {
  return daysFromNow(dueDateStr) < 0
}
