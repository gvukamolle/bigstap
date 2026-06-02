'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useId, useState } from 'react'

const navItems = [
  { href: '/shop', label: 'Магазин' },
  { href: '/blog', label: 'Блог' },
  { href: '/events', label: 'Ивенты' }
] as const

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const menuId = useId()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)

    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <header className="siteHeader">
      <div className="headerLeft">
        <button
          type="button"
          className="menuToggle"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
          onClick={() => setOpen((value) => !value)}
        >
          <span aria-hidden="true">{open ? '✕' : '☰'}</span>
        </button>
        <nav
          id={menuId}
          className={open ? 'siteNav siteNavOpen' : 'siteNav'}
          aria-label="Разделы сайта"
        >
          {navItems.map((item) => (
            <Link href={item.href} key={item.href} onClick={() => setOpen(false)}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <Link href="/" className="brand" aria-label="Grushko Stepan, на главную">
        <img src="/logo-mark.png" alt="" aria-hidden="true" className="brandMark" />
        <span>Grushko Stepan</span>
      </Link>
      <div className="headerRight">
        <Link href="/cart" className="navCart">
          Корзина
        </Link>
      </div>
    </header>
  )
}
