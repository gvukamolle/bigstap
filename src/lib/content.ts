import { cache } from 'react'

import type { SerializedEditorState } from 'lexical'

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
  /** Текст статьи из редактора (Lexical). Рендерится на странице статьи. */
  content?: SerializedEditorState
  productSlug?: string
  eventSlug?: string
  externalUrl?: string
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

/**
 * Внешняя ссылка приходит из CMS, поэтому пропускаем только http(s)-адреса —
 * чтобы из админки нельзя было подсунуть javascript:/data: ссылку в href.
 */
export function sanitizeExternalUrl(value: unknown): string | null {
  const raw = stringField(value)
  if (!raw) return null

  try {
    const url = new URL(raw)
    return url.protocol === 'http:' || url.protocol === 'https:' ? raw : null
  } catch {
    return null
  }
}

function parseRichText(value: unknown): SerializedEditorState | undefined {
  if (isRecord(value) && isRecord((value as { root?: unknown }).root)) {
    return value as unknown as SerializedEditorState
  }

  return undefined
}

/** Достаёт чистый текст из Lexical-документа — для SEO-описания статьи. */
export function lexicalToPlainText(value: unknown): string {
  const root = isRecord(value) ? (value as { root?: unknown }).root : null
  if (!isRecord(root)) return ''

  const parts: string[] = []
  const walk = (node: unknown) => {
    if (!isRecord(node)) return
    if (typeof node.text === 'string') parts.push(node.text)
    if (Array.isArray(node.children)) node.children.forEach(walk)
  }

  walk(root)
  return parts.join(' ').replace(/\s+/g, ' ').trim()
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
  const published = doc.published === true

  if (!published || !slug || !title) return null

  const fallback = fixtureBlogPosts.find((post) => post.slug === slug) ?? fixtureBlogPosts[0]

  const createdAt = stringField(doc.createdAt) ?? new Date().toISOString()
  const { date, dateTime } = formatRuDate(createdAt)

  const content = parseRichText(doc.content)
  // Анонс больше не вводится вручную: берём его из текста статьи (для SEO-описания).
  const excerpt =
    stringField(doc.excerpt) ?? (lexicalToPlainText(content).slice(0, 200).trim() || title)
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

  if (content) base.content = content
  if (productSlug) base.productSlug = productSlug
  if (eventSlug) base.eventSlug = eventSlug

  const externalUrl = sanitizeExternalUrl(doc.externalUrl)
  if (externalUrl) base.externalUrl = externalUrl

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

