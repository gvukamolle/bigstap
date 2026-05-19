import Link from 'next/link'

const footerLinks = [
  { href: '/shop', label: 'Магазин' },
  { href: '/blog', label: 'Блог' },
  { href: '/events', label: 'Ивенты' },
  { href: '/founder', label: 'Соцсети' },
  { href: '/admin', label: 'Админка' }
] as const

export function SiteFooter() {
  return (
    <footer className="siteFooter">
      <div className="footerBrand">BIGSTEP.RU</div>
      <nav className="footerLinks" aria-label="Навигация в подвале">
        {footerLinks.map((item) => (
          <Link
            href={item.href}
            key={item.href}
            prefetch={item.href === '/admin' ? false : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </footer>
  )
}
