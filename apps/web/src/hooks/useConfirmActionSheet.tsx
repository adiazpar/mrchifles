import { useCallback, useRef, useState } from 'react'
import { IonActionSheet } from '@ionic/react'

interface ConfirmOptions {
  header: string
  subHeader?: string
  destructiveLabel: string
  cancelLabel?: string
}

interface UseConfirmActionSheetReturn {
  confirm: (opts: ConfirmOptions) => Promise<boolean>
  actionSheet: JSX.Element
  _dispatchForTest?: (action: 'destructive' | 'cancel') => void
}

export function useConfirmActionSheet(): UseConfirmActionSheetReturn {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null)
  const resolverRef = useRef<((v: boolean) => void) | null>(null)

  const confirm = useCallback((next: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
      setOpts(next)
    })
  }, [])

  const settle = useCallback((value: boolean) => {
    resolverRef.current?.(value)
    resolverRef.current = null
    setOpts(null)
  }, [])

  const actionSheet = (
    <IonActionSheet
      isOpen={opts !== null}
      header={opts?.header}
      subHeader={opts?.subHeader}
      buttons={
        opts
          ? [
              { text: opts.destructiveLabel, role: 'destructive' },
              { text: opts.cancelLabel ?? 'Cancel', role: 'cancel' },
            ]
          : []
      }
      onDidDismiss={(event) => {
        const role = event.detail.role
        settle(role === 'destructive')
      }}
    />
  )

  return {
    confirm,
    actionSheet,
    _dispatchForTest:
      import.meta.env.MODE === 'test'
        ? (action) => settle(action === 'destructive')
        : undefined,
  }
}
