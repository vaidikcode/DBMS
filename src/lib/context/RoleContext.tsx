'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { MockRole } from '@/lib/constants'

interface RoleContextValue {
  role: MockRole
  setRole: (role: MockRole) => void
}

const RoleContext = createContext<RoleContextValue>({
  role: 'admin',
  setRole: () => {},
})

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<MockRole>('admin')

  useEffect(() => {
    const saved = localStorage.getItem('lms-mock-role') as MockRole | null
    if (saved) setRoleState(saved)
  }, [])

  const setRole = (r: MockRole) => {
    setRoleState(r)
    localStorage.setItem('lms-mock-role', r)
  }

  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole() {
  return useContext(RoleContext)
}
