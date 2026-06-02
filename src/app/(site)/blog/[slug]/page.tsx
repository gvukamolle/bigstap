import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ProductCard } from '@/components/ProductCard'
import { getCatalogProducts } from '@/lib/catalog'
import { getSiteBlogPostBySlug, getSiteEvents } from '@/lib/content'
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

  const products = await getCatalogProducts()
  const featuredProduct = post.productSlug
    ? products.find((product) => product.slug === post.productSlug)
    : undefined
  const featuredEvent = post.eventSlug ? (await getSiteEvents()).find((event) => event.slug === post.eventSlug) : undefined

  return (
    <div className="page">
      <article>
        <header className="article">
          <span className="eyebrow">{post.category}</span>
          <h1 className="display">{post.title}</h1>
          <time dateTime={post.dateTime}>{post.date}</time>
          <p>{post.excerpt}</p>
        </header>
        <div
          className="articleHeroImage"
          role="img"
          aria-label={post.image.alt}
          style={{ backgroundImage: `url(${post.image.src})` }}
        />

        <div className="articleBody">
          <p>
            Это прототип записи в журнале Grushko Stepan. Сейчас на сайте выводятся заголовок,
            анонс и обложка из админки.
          </p>
          <p>
            Следующий шаг — вывести сам текст из редактора и подключить медиатеку, чтобы статьи
            полностью управлялись из CMS.
          </p>

          <h2>Как будет работать редактор</h2>
          <p>
            В будущем редактор сможет вставлять текстовые блоки, изображения, связанные товары и
            ивенты между абзацами. Для покупателя это останется спокойной лентой без лишней
            перегрузки: сначала история, затем предмет или событие, если они действительно помогают
            продолжить материал.
          </p>

          {featuredProduct ? (
            <>
              <h2>Товар в материале</h2>
              <div className="contentList">
                <ProductCard product={featuredProduct} />
              </div>
            </>
          ) : null}

          {featuredEvent ? (
            <>
              <h2>Ивент в материале</h2>
              <div className="contentList">
                <Link className="contentCard" href={`/events/${featuredEvent.slug}`}>
                  <div
                    className="contentCardImage"
                    role="img"
                    aria-label={featuredEvent.image.alt}
                    style={{ backgroundImage: `url(${featuredEvent.image.src})` }}
                  />
                  <p className="contentCardMeta">
                    <time dateTime={featuredEvent.dateTime}>{featuredEvent.date}</time>
                    <span>{featuredEvent.location}</span>
                  </p>
                  <h2>{featuredEvent.title}</h2>
                  <p>{featuredEvent.description}</p>
                </Link>
              </div>
            </>
          ) : null}
        </div>
      </article>
    </div>
  )
}
