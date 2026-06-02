import Link from 'next/link'

const footerLinks = [
  { href: '/shop', label: 'Магазин' },
  { href: '/blog', label: 'Блог' },
  { href: '/events', label: 'Ивенты' },
  { href: '/admin', label: 'Админка' }
] as const

export function SiteFooter() {
  return (
    <footer className="siteFooter">
      <nav className="footerLegal" aria-label="Правовая информация">
        <Link href="/offer">Публичная оферта</Link>
        <Link href="/privacy">Политика конфиденциальности и обработки персональных данных</Link>
      </nav>
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
