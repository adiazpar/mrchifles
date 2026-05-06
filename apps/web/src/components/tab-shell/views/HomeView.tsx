'use client'

import { useIntl } from 'react-intl';

// Client component because TabShell mounts views from a 'use client'
// boundary. The original Server Component used `getTranslations` from
// next-intl/server; the client equivalent is `useTranslations` from
// next-intl. Same translated string, just resolved at render time on
// the client. The bundle cost is trivial (one short stub).
export function HomeView() {
  const t = useIntl()

  return (
    <main className="page-content">
      <div className="page-body">
        <div className="flex items-center justify-center h-64 border border-dashed border-border rounded-xl">
          <p className="text-text-secondary">{t.formatMessage({
            id: 'home.coming_soon'
          })}</p>
        </div>
      </div>
    </main>
  );
}
