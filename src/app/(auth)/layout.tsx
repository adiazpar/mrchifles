import Image from 'next/image'
import { getTranslations } from 'next-intl/server'

// Server Component
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const t = await getTranslations('auth')
  return (
    <div className="flex-1 flex flex-col">
      <div className="auth-container">
        <div className="auth-logo">
          <Image
            src="/icon-source.png"
            alt={t('logo_alt')}
            width={96}
            height={96}
            priority
          />
        </div>
        {children}
      </div>
    </div>
  )
}
