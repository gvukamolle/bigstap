import type { MetadataRoute } from 'next'

import { blogPosts, events } from '@/data/content'
import { getPublishedProducts } from '@/data/products'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'http://localhost:3000'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/shop`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${siteUrl}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${siteUrl}/events`, lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${siteUrl}/founder`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 }
  ]

  const productRoutes: MetadataRoute.Sitemap = getPublishedProducts().map((product) => ({
    url: `${siteUrl}/shop/${product.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.8
  }))

  const blogRoutes: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${siteUrl}/blog/${post.slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.5
  }))

  const eventRoutes: MetadataRoute.Sitemap = events.map((event) => ({
    url: `${siteUrl}/events/${event.slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.5
  }))

  return [...staticRoutes, ...productRoutes, ...blogRoutes, ...eventRoutes]
}
