interface BrandMarkProps {
  className?: string
}

export function BrandMark({ className }: BrandMarkProps) {
  const cls = ['auth-wordmark', className].filter(Boolean).join(' ')
  return <div className={cls}>Kasero</div>
}
