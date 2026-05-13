import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { ApiMessageCode } from '@kasero/shared/api-messages'

export type RegisterStep = 'name' | 'email' | 'password'

export interface RegisterNav {
  current: RegisterStep
  goTo: (step: RegisterStep) => void

  name: string
  setName: (v: string) => void

  email: string
  setEmail: (v: string) => void

  password: string
  setPassword: (v: string) => void

  // Submit-time state, owned by PasswordStep but readable elsewhere if needed.
  submitError: string | null
  setSubmitError: (v: string | null) => void

  submitErrorCode: ApiMessageCode | null
  setSubmitErrorCode: (v: ApiMessageCode | null) => void

  isSubmitting: boolean
  setIsSubmitting: (v: boolean) => void
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
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitErrorCode, setSubmitErrorCode] = useState<ApiMessageCode | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const value = useMemo<RegisterNav>(
    () => ({
      current,
      goTo: (step) => {
        setSubmitError(null)
        setSubmitErrorCode(null)
        setCurrent(step)
      },
      name,
      setName,
      email,
      setEmail,
      password,
      setPassword,
      submitError,
      setSubmitError,
      submitErrorCode,
      setSubmitErrorCode,
      isSubmitting,
      setIsSubmitting,
    }),
    [current, name, email, password, submitError, submitErrorCode, isSubmitting],
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
