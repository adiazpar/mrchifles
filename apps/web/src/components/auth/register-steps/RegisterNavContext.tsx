import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export type RegisterStep = 'name' | 'email' | 'password' | 'verify'

export interface RegisterNav {
  current: RegisterStep
  goTo: (step: RegisterStep) => void

  name: string
  setName: (v: string) => void

  email: string
  setEmail: (v: string) => void

  password: string
  setPassword: (v: string) => void

}

const RegisterNavContext = createContext<RegisterNav | null>(null)

interface ProviderProps {
  children: ReactNode
}

export function RegisterNavProvider({ children }: ProviderProps) {
  const [current, setCurrent] = useState<RegisterStep>('name')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const value = useMemo<RegisterNav>(
    () => ({
      current,
      goTo: (step) => setCurrent(step),
      name,
      setName,
      email,
      setEmail,
      password,
      setPassword,
    }),
    [current, name, email, password],
  )

  return <RegisterNavContext.Provider value={value}>{children}</RegisterNavContext.Provider>
}

export function useRegisterNav(): RegisterNav {
  const ctx = useContext(RegisterNavContext)
  if (!ctx) {
    throw new Error('useRegisterNav must be used inside <RegisterNavProvider>')
  }
  return ctx
}
