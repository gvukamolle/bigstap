import type { CollectionConfig } from 'payload'

import { isValidProductSlug } from '../../domain/products'
import { admins, staffOrPublishedProduct } from '../access'

const MAX_RUB_AMOUNT = 10_000_000
const MAX_STOCK = 100_000

type ProductSize = {
  label?: string | null
  stock?: number | null
}

type ProductData = {
  price?: number | null
  productType?: 'one_size' | 'sized' | null
  salePrice?: number | null
  sizes?: ProductSize[] | null
  stock?: number | null
}

const isSafeIntegerInRange = (value: unknown, max: number, min = 0): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max

const validateProductInvariants = (product: ProductData) => {
  const productType = product.productType ?? 'sized'

  if (!isSafeIntegerInRange(product.price, MAX_RUB_AMOUNT)) {
    throw new Error('Цена товара должна быть целым числом в рублях.')
  }

  if (product.salePrice != null && !isSafeIntegerInRange(product.salePrice, MAX_RUB_AMOUNT)) {
    throw new Error('Цена со скидкой должна быть целым числом в рублях.')
  }

  if (
    typeof product.salePrice === 'number' &&
    typeof product.price === 'number' &&
    product.salePrice > product.price
  ) {
    throw new Error('Цена со скидкой не может быть выше основной цены.')
  }

  if (productType === 'one_size' && !isSafeIntegerInRange(product.stock, MAX_STOCK)) {
    throw new Error('Безразмерные товары требуют целый остаток от 0 до 100000.')
  }

  if (productType === 'sized') {
    if (!Array.isArray(product.sizes) || product.sizes.length === 0) {
      throw new Error('Товарам с размерами нужен минимум один размер.')
    }

    const invalidSize = product.sizes.some(
      (size) =>
        typeof size.label !== 'string' ||
        !size.label.trim() ||
        !isSafeIntegerInRange(size.stock, MAX_STOCK)
    )

    if (invalidSize) {
      throw new Error('У каждого размера должны быть название и целый остаток от 0 до 100000.')
    }
  }
}

export const Products: CollectionConfig = {
  slug: 'products',
  labels: {
    singular: 'Товар',
    plural: 'Товары Grushko Stepan'
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'dropName', 'saleStatus', 'productType', 'price', 'published']
  },
  access: {
    create: admins,
    read: staffOrPublishedProduct,
    update: admins,
    delete: admins
  },
  hooks: {
    beforeValidate: [
      ({ data, originalDoc }) => {
        validateProductInvariants({
          ...(originalDoc as ProductData | undefined),
          ...(data as ProductData | undefined)
        })

        return data
      }
    ]
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Название',
      required: true
    },
    {
      name: 'slug',
      type: 'text',
      label: 'Адрес',
      required: true,
      unique: true,
      validate: (value: unknown) =>
        isValidProductSlug(value) ||
        'Адрес: только строчные латинские буквы, цифры и дефис, например test-01.'
    },
    {
      name: 'dropName',
      type: 'text',
      label: 'Дроп',
      required: true
    },
    {
      name: 'category',
      type: 'text',
      label: 'Категория',
      required: true
    },
    {
      name: 'image',
      type: 'relationship',
      label: 'Главное фото',
      relationTo: 'media'
    },
    {
      name: 'imageUrl',
      type: 'text',
      label: 'URL главного фото',
      required: true
    },
    {
      name: 'imageAlt',
      type: 'text',
      label: 'Описание главного фото',
      required: true
    },
    {
      name: 'imageTone',
      type: 'select',
      label: 'Фон фото',
      required: true,
      defaultValue: 'black',
      options: [
        {
          label: 'Светлый',
          value: 'cream'
        },
        {
          label: 'Камень',
          value: 'stone'
        },
        {
          label: 'Темный',
          value: 'charcoal'
        },
        {
          label: 'Черный',
          value: 'black'
        }
      ]
    },
    {
      name: 'price',
      type: 'number',
      label: 'Цена',
      required: true,
      min: 0,
      max: MAX_RUB_AMOUNT,
      admin: {
        step: 1
      }
    },
    {
      name: 'salePrice',
      type: 'number',
      label: 'Цена со скидкой',
      min: 0,
      max: MAX_RUB_AMOUNT,
      admin: {
        step: 1
      }
    },
    {
      name: 'productType',
      type: 'select',
      label: 'Тип размера',
      required: true,
      defaultValue: 'sized',
      options: [
        {
          label: 'Размерная сетка',
          value: 'sized'
        },
        {
          label: 'Без размера',
          value: 'one_size'
        }
      ]
    },
    {
      name: 'sizes',
      type: 'array',
      label: 'Размеры',
      labels: {
        singular: 'Размер',
        plural: 'Размеры'
      },
      admin: {
        condition: (_, siblingData) => siblingData.productType === 'sized'
      },
      fields: [
        {
          name: 'label',
          type: 'text',
          label: 'Размер',
          required: true
        },
        {
          name: 'stock',
          type: 'number',
          label: 'Остаток',
          required: true,
          min: 0,
          max: MAX_STOCK,
          admin: {
            step: 1
          }
        }
      ]
    },
    {
      name: 'stock',
      type: 'number',
      label: 'Остаток',
      min: 0,
      max: MAX_STOCK,
      admin: {
        condition: (_, siblingData) => siblingData.productType === 'one_size',
        step: 1
      }
    },
    {
      name: 'saleStatus',
      type: 'select',
      label: 'Статус продажи',
      required: true,
      defaultValue: 'in_stock',
      options: [
        {
          label: 'В наличии',
          value: 'in_stock'
        },
        {
          label: 'Предзаказ',
          value: 'preorder'
        },
        {
          label: 'Нет в наличии',
          value: 'sold_out'
        },
        {
          label: 'Скрыт',
          value: 'hidden'
        }
      ]
    },
    {
      name: 'preorderNote',
      type: 'text',
      label: 'Комментарий к предзаказу',
      admin: {
        condition: (data) => data.saleStatus === 'preorder'
      }
    },
    {
      name: 'shortDescription',
      type: 'textarea',
      label: 'Короткое описание',
      required: true
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Описание',
      required: true
    },
    {
      name: 'published',
      type: 'checkbox',
      label: 'Опубликовано',
      defaultValue: false
    }
  ]
}
