import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { getSiteEventBySlug } from '@/lib/content'
import { getAbsoluteAssetUrl, getCanonicalUrl } from '@/lib/siteUrl'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const event = await getSiteEventBySlug(slug)
  if (!event) return {}

  const url = getCanonicalUrl(`/events/${event.slug}`)
  const imageUrl = getAbsoluteAssetUrl(event.image.src)

  return {
    title: event.title,
    description: event.description,
    alternates: { canonical: url },
    openGraph: {
      url,
      title: `${event.title} | Grushko Stepan`,
      description: event.description,
      images: [{ url: imageUrl, alt: event.image.alt }]
    },
    twitter: {
      card: 'summary_large_image',
      title: `${event.title} | Grushko Stepan`,
      description: event.description,
      images: [imageUrl]
    }
  }
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const event = await getSiteEventBySlug(slug)

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
        <div
          className="articleHeroImage"
          role="img"
          aria-label={event.image.alt}
          style={{ backgroundImage: `url(${event.image.src})` }}
        />
      </article>
    </div>
  )
}
