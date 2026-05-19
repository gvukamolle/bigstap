import { notFound } from 'next/navigation'

import { events } from '@/data/content'

export function generateStaticParams() {
  return events.map((event) => ({ slug: event.slug }))
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const event = events.find((item) => item.slug === slug)

  if (!event) {
    notFound()
  }

  return (
    <div className="page">
      <article>
        <header className="article">
          <span className="eyebrow">Ивент</span>
          <h1 className="display">{event.title}</h1>
          <time dateTime={event.dateTime}>{event.date}</time>
          <p>{event.location}</p>
          <p>{event.description}</p>
        </header>
      </article>
    </div>
  )
}
