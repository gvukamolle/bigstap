import type { Metadata } from 'next'

import { getCanonicalUrl } from '@/lib/siteUrl'

export const metadata: Metadata = {
  title: 'Ивенты',
  description: 'Ивенты Grushko Stepan.',
  alternates: { canonical: getCanonicalUrl('/events') },
  openGraph: { url: getCanonicalUrl('/events') }
}

export const dynamic = 'force-dynamic'

export default function EventsPage() {
  return (
    <div className="page">
      <section className="shopIntro">
        <h1 className="display">Ивенты</h1>
        <p>Пока тут ничего нет, но скоро появится.</p>
      </section>
    </div>
  )
}
