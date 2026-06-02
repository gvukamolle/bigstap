import type { Metadata } from 'next'
import Link from 'next/link'

import { getSiteBlogPosts } from '@/lib/content'
import { getCanonicalUrl } from '@/lib/siteUrl'

export const metadata: Metadata = {
  title: 'Журнал',
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
        <span className="eyebrow">Блог</span>
        <h1 className="display">Журнал</h1>
        <p>Заметки о вещах, материалах и спокойном ритме вокруг первого дропа Grushko Stepan.</p>
      </section>

      <div className="contentList">
        {blogPosts.map((post) => (
          <Link className="contentCard" href={`/blog/${post.slug}`} key={post.slug}>
            <div
              className="contentCardImage"
              role="img"
              aria-label={post.image.alt}
              style={{ backgroundImage: `url(${post.image.src})` }}
            />
            <p className="contentCardMeta">
              <span>{post.category}</span>
              <span>{post.date}</span>
            </p>
            <h2>{post.title}</h2>
            <p>{post.excerpt}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
