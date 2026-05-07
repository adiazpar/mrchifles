import { useCallback, useRef, useState, type ReactNode } from 'react'
import { IonAlert } from '@ionic/react'

interface AlertOptions {
  header: string
  message: string
  okLabel?: string
}

interface UseInfoAlertReturn {
  show: (opts: AlertOptions) => Promise<void>
  alert: ReactNode
  _dispatchForTest?: () => void
}

export function useInfoAlert(): UseInfoAlertReturn {
  const [opts, setOpts] = useState<AlertOptions | null>(null)
  const resolverRef = useRef<(() => void) | null>(null)

  const show = useCallback((next: AlertOptions) => {
    // Double-call guard: if a previous show() is still pending, the
    // second call resolves immediately rather than overwriting the
    // first resolver — which would leave it hanging forever.
    if (resolverRef.current !== null) return Promise.resolve()
    return new Promise<void>((resolve) => {
      resolverRef.current = resolve
      setOpts(next)
    })
  }, [])

  const settle = useCallback(() => {
    resolverRef.current?.()
    resolverRef.current = null
    setOpts(null)
  }, [])

  const alert = (
    <IonAlert
      isOpen={opts !== null}
      header={opts?.header}
      message={opts?.message}
      buttons={[opts?.okLabel ?? 'OK']}
      onDidDismiss={settle}
    />
  )

  return {
    show,
    alert,
    _dispatchForTest: import.meta.env.MODE === 'test' ? settle : undefined,
  }
}
