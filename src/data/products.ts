import type { OneSizeProduct, Product, SizedProduct } from '../domain/products'

const productFixtures = [
  {
    slug: 'overshirt-01',
    title: 'Овершерт 01',
    category: 'Одежда',
    price: 12900,
    saleStatus: 'in_stock',
    type: 'sized',
    sizes: [
      { label: 'S', stock: 3 },
      { label: 'M', stock: 5 },
      { label: 'L', stock: 2 }
    ],
    shortDescription: 'Плотный овершерт свободного кроя.',
    description: 'Базовый слой для города: чистая линия, плотная фактура, спокойная посадка.',
    image: {
      src: '/images/bigstep/product-overshirt.jpg',
      alt: 'Черный овершерт BIGSTEP на светлом студийном фоне'
    },
    imageTone: 'black',
    published: true
  },
  {
    slug: 'tee-preorder',
    title: 'Футболка предзаказ',
    category: 'Одежда',
    price: 7900,
    saleStatus: 'preorder',
    type: 'sized',
    sizes: [
      { label: 'S', stock: 99 },
      { label: 'M', stock: 99 },
      { label: 'L', stock: 99 }
    ],
    shortDescription: 'Предзаказ на базовую футболку первого дропа.',
    description: 'Мягкий хлопок, прямой силуэт, минимальная маркировка. Отправка после производства партии.',
    image: {
      src: '/images/bigstep/product-tee.jpg',
      alt: 'Светлая футболка BIGSTEP с минимальной маркировкой'
    },
    imageTone: 'stone',
    preorderNote: 'Ориентировочная отправка: через 3-4 недели после оплаты.',
    published: true
  },
  {
    slug: 'bag-one-size',
    title: 'Сумка без размера',
    category: 'Аксессуары',
    price: 6900,
    saleStatus: 'in_stock',
    type: 'one_size',
    stock: 8,
    shortDescription: 'Лаконичная сумка без размерной сетки.',
    description: 'Аксессуар на каждый день с чистой формой и плотным материалом.',
    image: {
      src: '/images/bigstep/product-bag.jpg',
      alt: 'Темная сумка BIGSTEP на нейтральном фоне'
    },
    imageTone: 'charcoal',
    published: true
  },
  {
    slug: 'cap-one-size',
    title: 'Кепка без размера',
    category: 'Аксессуары',
    price: 4900,
    saleStatus: 'in_stock',
    type: 'one_size',
    stock: 12,
    shortDescription: 'Безразмерная кепка с регулируемой посадкой.',
    description: 'Светлая база, минимум деталей, регулируемая посадка.',
    image: {
      src: '/images/bigstep/product-cap.jpg',
      alt: 'Светлая кепка BIGSTEP с регулируемой посадкой'
    },
    imageTone: 'cream',
    published: true
  }
] as const satisfies readonly Product[]

function deepFreezeProduct(product: Product): Product {
  Object.freeze(product.image)

  if (product.type === 'sized') {
    for (const size of product.sizes) {
      Object.freeze(size)
    }

    Object.freeze(product.sizes)
  }

  return Object.freeze(product)
}

export const products: readonly Product[] = Object.freeze(productFixtures.map((product) => deepFreezeProduct(product)))

function cloneProduct(product: Product): Product {
  if (product.type === 'sized') {
    const sizedProduct: SizedProduct = {
      ...product,
      sizes: product.sizes.map((size) => ({ ...size }))
    }

    return sizedProduct
  }

  const oneSizeProduct: OneSizeProduct = { ...product }

  return oneSizeProduct
}

export function getPublishedProducts(): Product[] {
  return products
    .filter((product) => product.published && product.saleStatus !== 'hidden')
    .map((product) => cloneProduct(product))
}

export function getProductBySlug(slug: string): Product | undefined {
  return getPublishedProducts().find((product) => product.slug === slug)
}
