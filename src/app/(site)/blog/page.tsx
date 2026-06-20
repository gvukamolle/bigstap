import type { Metadata } from 'next'
import Link from 'next/link'

import { getSiteBlogPosts } from '@/lib/content'
import { getCanonicalUrl } from '@/lib/siteUrl'

export const metadata: Metadata = {
  title: 'Блог',
  description: 'Заметки о вещах, материалах и спокойном ритме Grushko Stepan.',
  alternates: { canonical: getCanonicalUrl('/blog') },
  openGraph: { url: getCanonicalUrl('/blog') }
}

export const dynamic = 'force-dynamic'

export default async function BlogPage() {
  const blogPosts = await getSiteBlogPosts()

  return (
    <div className="page">
      <section className="shopIntro">
        <h1 className="display">Блог</h1>
      </section>

      <div className="contentList contentListBlog">
        {blogPosts.map((post) => (
          <article className="contentCard" key={post.slug}>
            {/* Обычный img — фото в исходных пропорциях, без обрезки под фиксированную высоту. */}
            <img className="contentCardPhoto" src={post.image.src} alt={post.image.alt} loading="lazy" />
            <div className="contentCardBody">
              <p className="contentCardMeta">
                <span>{post.date}</span>
              </p>
              <h2>
                <Link className="contentCardLink" href={`/blog/${post.slug}`}>
                  {post.title}
                </Link>
              </h2>
              {post.externalUrl ? (
                <a
                  className="contentCardExternal"
                  href={post.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Читать по ссылке →
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
