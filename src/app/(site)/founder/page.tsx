import type { Metadata } from 'next'

import { founder } from '@/data/content'

export const metadata: Metadata = {
  title: 'Основатель',
  description: 'Кто стоит за BIGSTEP и зачем мы делаем собственный шмот.'
}

export default function FounderPage() {
  return (
    <div className="page">
      <section className="founderHero">
        <div>
          <span className="eyebrow">Основатель</span>
          <h1 className="display">{founder.title}</h1>
        </div>

        <div className="founderStory">
          <div
            className="founderMedia"
            role="img"
            aria-label={founder.image.alt}
            style={{ backgroundImage: `url(${founder.image.src})` }}
          />
          <div className="founderText">
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
        </div>
      </section>
    </div>
  )
}
