import type { OneSizeProduct, Product, SizedProduct } from '../domain/products'

const productFixtures = [
  {
    slug: 'test-00',
    title: 'ТЕСТ 00',
    dropName: 'ТЕСТ 00',
    category: 'Футболка',
    price: 7900,
    saleStatus: 'in_stock',
    type: 'sized',
    sizes: [
      { label: '3', stock: 20 }
    ],
    shortDescription:
      'Кроп-фит, собственно разработанные лекала. 100% хлопок. Без рестоков, ограниченный тираж.',
    description:
      'Дроп ТЕСТ 00 построен вокруг светлой футболки свободного силуэта. Спереди — золотой знак с двумя фигурами и фразой Try Explore Create Try again, сзади — крупный номер 00 и подпись Grushko Stepan.',
    image: {
      src: '/images/bigstep/test-00-front.jpg',
      alt: 'Белая футболка ТЕСТ 00, вид спереди'
    },
    gallery: [
      {
        src: '/images/bigstep/test-00-front.jpg',
        alt: 'Белая футболка ТЕСТ 00, вид спереди',
        label: 'Перед'
      },
      {
        src: '/images/bigstep/test-00-back.jpg',
        alt: 'Белая футболка ТЕСТ 00, вид со спины',
        label: 'Спина'
      }
    ],
    imageTone: 'cream',
    published: true
  },
  {
    slug: 'test-01',
    title: 'ТЕСТ 01',
    dropName: 'ТЕСТ 01',
    category: 'Футболка',
    price: 7900,
    saleStatus: 'in_stock',
    type: 'sized',
    sizes: [
      { label: '3', stock: 20 }
    ],
    shortDescription:
      'Кроп-фит, собственно разработанные лекала. 100% хлопок. Без рестоков, ограниченный тираж.',
    description:
      'Дроп ТЕСТ 01 собран вокруг камуфляжной футболки свободного кроя. Спереди — белый знак-маска и фраза Try Explore Create Try again, сзади — крупный номер 01 и подпись Grushko Stepan.',
    image: {
      src: '/images/bigstep/test-01-front.jpg',
      alt: 'Камуфляжная футболка ТЕСТ 01, вид спереди'
    },
    gallery: [
      {
        src: '/images/bigstep/test-01-front.jpg',
        alt: 'Камуфляжная футболка ТЕСТ 01, вид спереди',
        label: 'Перед'
      },
      {
        src: '/images/bigstep/test-01-back.jpg',
        alt: 'Камуфляжная футболка ТЕСТ 01, вид со спины',
        label: 'Спина'
      }
    ],
    imageTone: 'charcoal',
    published: true
  }
] as const satisfies readonly Product[]

function deepFreezeProduct(product: Product): Product {
  Object.freeze(product.image)
  if (product.gallery) {
    for (const image of product.gallery) {
      Object.freeze(image)
    }

    Object.freeze(product.gallery)
  }

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
