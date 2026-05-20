export const blogPosts = [
  {
    slug: 'drop-01-notes',
    title: 'Заметки к первому дропу',
    excerpt: 'Почему первая капсула начинается с простых вещей и спокойной формы.',
    category: 'Журнал',
    date: '19 мая 2026',
    dateTime: '2026-05-19',
    image: {
      src: '/images/bigstep/editorial-journal.jpg',
      alt: 'Рабочий стол редакции BIGSTEP с тканями и заметками'
    },
    productSlug: 'test-00',
    eventSlug: 'studio-open-day'
  },
  {
    slug: 'materials-and-fit',
    title: 'Материалы и посадка',
    excerpt: 'Коротко о тканях, силуэте и том, как мы думаем о базовом гардеробе.',
    category: 'Процесс',
    date: '19 мая 2026',
    dateTime: '2026-05-19',
    image: {
      src: '/images/bigstep/journal-studio.jpg',
      alt: 'Материалы и силуэты первого дропа BIGSTEP'
    },
    productSlug: 'test-01'
  }
]

export const events = [
  {
    slug: 'studio-open-day',
    title: 'Открытый день в студии',
    date: 'Июнь 2026',
    dateTime: '2026-06',
    location: 'Москва',
    image: {
      src: '/images/bigstep/editorial-event.jpg',
      alt: 'Студийное пространство BIGSTEP для открытой встречи'
    },
    description: 'Анонс открытой встречи, где можно увидеть вещи и обсудить первый дроп.'
  }
]

export const founder = {
  title: 'Основатель BIGSTEP',
  text: 'BIGSTEP строится вокруг собственного шмота, спокойной визуальной культуры и аккуратного отношения к деталям.',
  image: {
    src: '/images/bigstep/editorial-founder.jpg',
    alt: 'Студийный угол BIGSTEP с жакетом, блокнотом и чашкой'
  },
  socialLinks: [
    { label: 'Телеграм', href: 'https://t.me/' },
    { label: 'Инстаграм', href: 'https://instagram.com/' }
  ]
}
