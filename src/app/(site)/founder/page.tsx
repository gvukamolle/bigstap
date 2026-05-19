import { founder } from '@/data/content'

export default function FounderPage() {
  return (
    <div className="page">
      <section className="founderHero">
        <div>
          <span className="eyebrow">Основатель</span>
          <h1 className="display">{founder.title}</h1>
        </div>

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
      </section>
    </div>
  )
}
