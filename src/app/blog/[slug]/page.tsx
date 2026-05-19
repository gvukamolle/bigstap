import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ProductCard } from '@/components/ProductCard'
import { blogPosts, events } from '@/data/content'
import { getPublishedProducts } from '@/data/products'

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }))
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = blogPosts.find((item) => item.slug === slug)

  if (!post) {
    notFound()
  }

  const featuredProduct = getPublishedProducts()[0]
  const featuredEvent = events[0]

  return (
    <div className="page">
      <article>
        <header className="article">
          <span className="eyebrow">{post.category}</span>
          <h1 className="display">{post.title}</h1>
          <time dateTime={post.dateTime}>{post.date}</time>
          <p>{post.excerpt}</p>
        </header>

        <div className="articleBody">
          <p>
            Это прототип записи в журнале BIGSTEP. Сейчас текст собран из фикстур, чтобы показать
            будущую структуру страницы до подключения редактора и медиа-библиотеки.
          </p>
          <p>
            После запуска контент-команда сможет добавлять сюда длинные абзацы, фотографии кампании,
            детали производства, подборки товаров и ссылки на события. Страница уже держит этот
            сценарий: материал читается как журнал, но может аккуратно вести к витрине и анонсам.
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
                  <p>
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
