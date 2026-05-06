'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body style={{ padding: 16, fontFamily: 'monospace', fontSize: 12 }}>
        <h2>Client error</h2>
        <p>
          <strong>{error.name}:</strong> {error.message}
        </p>
        {error.digest && <p>digest: {error.digest}</p>}
        <pre style={{ whiteSpace: 'pre-wrap' }}>{error.stack}</pre>
        <button onClick={reset}>Retry</button>
      </body>
    </html>
  )
}
