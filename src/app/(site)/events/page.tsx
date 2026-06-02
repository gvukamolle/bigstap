import type { Metadata } from 'next'
import Link from 'next/link'

import { getSiteEvents } from '@/lib/content'
import { getCanonicalUrl } from '@/lib/siteUrl'

export const metadata: Metadata = {
  title: 'Ивенты',
  description: 'Анонсы открытых встреч и студийных дней Grushko Stepan.',
  alternates: { canonical: getCanonicalUrl('/events') },
  openGraph: { url: getCanonicalUrl('/events') }
}

export const dynamic = 'force-dynamic'

export default async function EventsPage() {
  const events = await getSiteEvents()

  return (
    <div className="page">
      <section className="shopIntro">
        <span className="eyebrow">Ивенты</span>
        <h1 className="display">Анонсы</h1>
        <p>Пока только анонсы. Запись и билеты появятся позже.</p>
      </section>

      <div className="contentList">
        {events.map((event) => (
          <Link className="contentCard" href={`/events/${event.slug}`} key={event.slug}>
            <div
              className="contentCardImage"
              role="img"
              aria-label={event.image.alt}
              style={{ backgroundImage: `url(${event.image.src})` }}
            />
            <p className="contentCardMeta">
              <span>{event.date}</span>
              <span>{event.location}</span>
            </p>
            <h2>{event.title}</h2>
            <p>{event.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
