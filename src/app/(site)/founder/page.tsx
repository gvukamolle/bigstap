import type { Metadata } from 'next'

import { founder } from '@/data/content'
import { getCanonicalUrl } from '@/lib/siteUrl'

export const metadata: Metadata = {
  title: 'Основатель',
  description: 'Кто стоит за Grushko Stepan и зачем мы делаем собственный шмот.',
  alternates: { canonical: getCanonicalUrl('/founder') },
  openGraph: { url: getCanonicalUrl('/founder') }
}

export default function FounderPage() {
  return (
    <div className="page">
      <section className="founderHero">
        <div className="founderText">
          <span className="eyebrow">Основатель</span>
          <h1 className="display">{founder.title}</h1>
          <p>{founder.text}</p>
          <nav className="socialLinks" aria-label="Социальные ссылки основателя">
            {founder.socialLinks.map((link) => (
              <a
                className="buttonSecondary"
                href={link.href}
                key={link.label}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Открыть ${link.label}`}
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="founderStory">
          <div
            className="founderMedia"
            role="img"
            aria-label={founder.image.alt}
            style={{ backgroundImage: `url(${founder.image.src})` }}
          />
        </div>
      </section>
    </div>
  )
}
