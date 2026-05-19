import Link from 'next/link'

const navItems = [
  { href: '/shop', label: 'Магазин' },
  { href: '/blog', label: 'Блог' },
  { href: '/events', label: 'Ивенты' },
  { href: '/founder', label: 'Основатель' },
  { href: '/cart', label: 'Корзина' }
] as const

export function SiteHeader() {
  return (
    <header className="siteHeader">
      <Link href="/" className="brand" aria-label="BIGSTEP, на главную">
        BIGSTEP
      </Link>
      <nav className="siteNav" aria-label="Основная навигация">
        {navItems.map((item) => (
          <Link href={item.href} key={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
