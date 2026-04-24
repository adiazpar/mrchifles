import { getTranslations } from 'next-intl/server'

// Render as a Server Component — stub only uses translations, no client
// state or events. Drops the client bundle for this route to zero.
export default async function HomePage() {
  const t = await getTranslations('home')
  // Header is set optimistically by nav component

  return (
    <main className="page-content">
      <div className="page-body">
        <div className="flex items-center justify-center h-64 border border-dashed border-border rounded-xl">
          <p className="text-text-secondary">{t('coming_soon')}</p>
        </div>
      </div>
    </main>
  )
}
