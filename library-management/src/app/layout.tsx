import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { RoleProvider } from '@/lib/context/RoleContext'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Library Management System — Thapar Institute',
  description: 'DBMS Project UCS310 — Library Management System built with Next.js and Supabase',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <RoleProvider>
            <QueryProvider>
              {children}
              <Toaster />
            </QueryProvider>
          </RoleProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
