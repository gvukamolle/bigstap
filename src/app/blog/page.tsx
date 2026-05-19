import Link from 'next/link'

import { blogPosts } from '@/data/content'

export default function BlogPage() {
  return (
    <div className="page">
      <section className="shopIntro">
        <span className="eyebrow">Блог</span>
        <h1 className="display">Journal</h1>
        <p>Заметки о вещах, материалах и спокойном ритме вокруг первого дропа BIGSTEP.</p>
      </section>

      <div className="contentList">
        {blogPosts.map((post) => (
          <Link className="contentCard" href={`/blog/${post.slug}`} key={post.slug}>
            <p>
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
