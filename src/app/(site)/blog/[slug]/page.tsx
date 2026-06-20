import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { RichText } from '@payloadcms/richtext-lexical/react'

import { getSiteBlogPostBySlug } from '@/lib/content'
import { getAbsoluteAssetUrl, getCanonicalUrl } from '@/lib/siteUrl'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = await getSiteBlogPostBySlug(slug)
  if (!post) return {}

  const url = getCanonicalUrl(`/blog/${post.slug}`)
  const imageUrl = getAbsoluteAssetUrl(post.image.src)

  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: url },
    openGraph: {
      url,
      title: `${post.title} | Grushko Stepan`,
      description: post.excerpt,
      images: [{ url: imageUrl, alt: post.image.alt }]
    },
    twitter: {
      card: 'summary_large_image',
      title: `${post.title} | Grushko Stepan`,
      description: post.excerpt,
      images: [imageUrl]
    }
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getSiteBlogPostBySlug(slug)

  if (!post) {
    notFound()
  }

  return (
    <div className="page">
      <article>
        <header className="article">
          <h1 className="display">{post.title}</h1>
          <time dateTime={post.dateTime}>{post.date}</time>
          {post.externalUrl ? (
            <a
              className="buttonSecondary articleExternalLink"
              href={post.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Читать по ссылке →
            </a>
          ) : null}
        </header>

        {/* Обложка в исходном формате, без обрезки. */}
        <img className="articleHeroImage" src={post.image.src} alt={post.image.alt} loading="lazy" />

        {post.content ? (
          <div className="articleBody">
            <RichText data={post.content} />
          </div>
        ) : null}
      </article>
    </div>
  )
}
