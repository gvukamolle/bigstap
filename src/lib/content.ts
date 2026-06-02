import { cache } from 'react'

import { blogPosts as fixtureBlogPosts, events as fixtureEvents } from '@/data/content'

type PayloadMediaDoc = Record<string, unknown>
type PayloadDoc = Record<string, unknown>

export type SiteBlogPost = {
  slug: string
  title: string
  excerpt: string
  category: string
  date: string
  dateTime: string
  image: { src: string; alt: string }
  productSlug?: string
  eventSlug?: string
}

export type SiteEvent = {
  slug: string
  title: string
  date: string
  dateTime: string
  location: string
  image: { src: string; alt: string }
  description: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function stringField(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function formatRuDate(isoDateTime: string): { date: string; dateTime: string } {
  const dateObj = new Date(isoDateTime)
  const dateTime = isoDateTime.slice(0, 10)
  const formatted = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(dateObj)

  return { date: formatted.replace(/\sг\.$/u, ''), dateTime }
}

function mediaFromDoc(media: unknown, fallback: { src: string; alt: string }) {
  if (isRecord(media)) {
    const url = stringField((media as PayloadMediaDoc).url)
    const alt = stringField((media as PayloadMediaDoc).alt) ?? fallback.alt
    if (url) return { src: url, alt }
  }

  return fallback
}

function mapPayloadEvent(doc: PayloadDoc): SiteEvent | null {
  const slug = stringField(doc.slug)
  const title = stringField(doc.title)
  const dateLabel = stringField(doc.dateLabel)
  const location = stringField(doc.location)
  const description = stringField(doc.description)
  const published = doc.published === true

  if (!published || !slug || !title || !dateLabel || !location || !description) return null

  const fallback = fixtureEvents.find((event) => event.slug === slug) ?? fixtureEvents[0]
  const image = mediaFromDoc(doc.image, fallback.image)

  return {
    slug,
    title,
    date: dateLabel,
    dateTime: stringField(doc.createdAt) ?? fallback.dateTime,
    location,
    image,
    description
  }
}

function mapPayloadBlogPost(doc: PayloadDoc): SiteBlogPost | null {
  const slug = stringField(doc.slug)
  const title = stringField(doc.title)
  const excerpt = stringField(doc.excerpt)
  const published = doc.published === true

  if (!published || !slug || !title || !excerpt) return null

  const fallback = fixtureBlogPosts.find((post) => post.slug === slug) ?? fixtureBlogPosts[0]

  const createdAt = stringField(doc.createdAt) ?? new Date().toISOString()
  const { date, dateTime } = formatRuDate(createdAt)

  const category = stringField(doc.category) ?? fallback.category
  const image = mediaFromDoc(doc.image, fallback.image)

  const firstRelatedProduct = Array.isArray(doc.relatedProducts)
    ? doc.relatedProducts.find((value) => isRecord(value) && typeof value.slug === 'string')
    : null
  const productSlug =
    firstRelatedProduct && isRecord(firstRelatedProduct) ? stringField(firstRelatedProduct.slug) : null

  const firstRelatedEvent = Array.isArray(doc.relatedEvents)
    ? doc.relatedEvents.find((value) => isRecord(value) && typeof value.slug === 'string')
    : null
  const eventSlug =
    firstRelatedEvent && isRecord(firstRelatedEvent) ? stringField(firstRelatedEvent.slug) : null

  const base: SiteBlogPost = {
    slug,
    title,
    excerpt,
    category,
    date,
    dateTime,
    image
  }

  if (productSlug) base.productSlug = productSlug
  if (eventSlug) base.eventSlug = eventSlug

  return base
}

export const getSiteEvents = cache(async (): Promise<SiteEvent[]> => {
  try {
    const [{ default: config }, { getPayload }] = await Promise.all([
      import('../../payload.config'),
      import('payload')
    ])
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'events',
      depth: 1,
      limit: 100,
      sort: '-createdAt',
      where: { published: { equals: true } }
    })

    const cmsEvents = result.docs
      .map((doc) => mapPayloadEvent(doc as unknown as PayloadDoc))
      .filter((event): event is SiteEvent => event !== null)

    return cmsEvents.length > 0 ? cmsEvents : fixtureEvents
  } catch {
    return fixtureEvents
  }
})

export const getSiteBlogPosts = cache(async (): Promise<SiteBlogPost[]> => {
  try {
    const [{ default: config }, { getPayload }] = await Promise.all([
      import('../../payload.config'),
      import('payload')
    ])
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'blog-posts',
      depth: 1,
      limit: 100,
      sort: '-createdAt',
      where: { published: { equals: true } }
    })

    const cmsPosts = result.docs
      .map((doc) => mapPayloadBlogPost(doc as unknown as PayloadDoc))
      .filter((post): post is SiteBlogPost => post !== null)

    return cmsPosts.length > 0 ? cmsPosts : fixtureBlogPosts
  } catch {
    return fixtureBlogPosts
  }
})

export async function getSiteEventBySlug(slug: string): Promise<SiteEvent | undefined> {
  return (await getSiteEvents()).find((event) => event.slug === slug)
}

export async function getSiteBlogPostBySlug(slug: string): Promise<SiteBlogPost | undefined> {
  return (await getSiteBlogPosts()).find((post) => post.slug === slug)
}

