import type { MetadataRoute } from 'next'

import { getCatalogProducts } from '@/lib/catalog'
import { getSiteBlogPosts, getSiteEvents } from '@/lib/content'
import { getCanonicalUrl } from '@/lib/siteUrl'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: getCanonicalUrl('/'), lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: getCanonicalUrl('/shop'), lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: getCanonicalUrl('/blog'), lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: getCanonicalUrl('/events'), lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
    { url: getCanonicalUrl('/founder'), lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: getCanonicalUrl('/offer'), lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: getCanonicalUrl('/privacy'), lastModified: now, changeFrequency: 'yearly', priority: 0.2 }
  ]

  const productRoutes: MetadataRoute.Sitemap = (await getCatalogProducts()).map((product) => ({
    url: getCanonicalUrl(`/shop/${product.slug}`),
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.8
  }))

  const blogRoutes: MetadataRoute.Sitemap = (await getSiteBlogPosts()).map((post) => ({
    url: getCanonicalUrl(`/blog/${post.slug}`),
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.5
  }))

  const eventRoutes: MetadataRoute.Sitemap = (await getSiteEvents()).map((event) => ({
    url: getCanonicalUrl(`/events/${event.slug}`),
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.5
  }))

  return [...staticRoutes, ...productRoutes, ...blogRoutes, ...eventRoutes]
}
