import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useSearchParams } from '@/lib/next-navigation-shim'

export type RegisterStep = 'email' | 'verify' | 'name'

export interface RegisterNav {
  current: RegisterStep
  goTo: (step: RegisterStep) => void

  email: string
  setEmail: (v: string) => void

  isNewUser: boolean | null
  setIsNewUser: (v: boolean) => void

  name: string
  setName: (v: string) => void
}

const RegisterNavContext = createContext<RegisterNav | null>(null)

interface ProviderProps {
  children: ReactNode
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function RegisterNavProvider({ children }: ProviderProps) {
  // EntryPage hands off via /register?email={x}&step=verify after a
  // successful OTP send. Honor those params so the wizard resumes at
  // the verify step with the email pre-filled. Anything else (or no
  // params) starts at the email step.
  const searchParams = useSearchParams()
  const initialEmail = useMemo(() => {
    const raw = searchParams.get('email')
    return raw && EMAIL_RE.test(raw.trim()) ? raw.trim() : ''
  }, [searchParams])
  const initialStep = useMemo<RegisterStep>(() => {
    const stepParam = searchParams.get('step')
    if (stepParam === 'verify' && initialEmail) return 'verify'
    return 'email'
  }, [searchParams, initialEmail])

  const [current, setCurrent] = useState<RegisterStep>(initialStep)
  const [email, setEmail] = useState(initialEmail)
  const [isNewUser, setIsNewUser] = useState<boolean | null>(null)
  const [name, setName] = useState('')

  const value = useMemo<RegisterNav>(
    () => ({
      current,
      goTo: (step) => setCurrent(step),
      email,
      setEmail,
      isNewUser,
      setIsNewUser,
      name,
      setName,
    }),
    [current, email, isNewUser, name],
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
