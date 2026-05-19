import type { CollectionConfig } from 'payload'

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
  admin: {
    useAsTitle: 'title'
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
      required: true
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true
    },
    {
      name: 'category',
      type: 'text',
      required: true
    },
    {
      name: 'price',
      type: 'number',
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
      min: 0,
      max: MAX_RUB_AMOUNT,
      admin: {
        step: 1
      }
    },
    {
      name: 'productType',
      type: 'select',
      required: true,
      defaultValue: 'sized',
      options: [
        {
          label: 'Sized',
          value: 'sized'
        },
        {
          label: 'One size',
          value: 'one_size'
        }
      ]
    },
    {
      name: 'sizes',
      type: 'array',
      admin: {
        condition: (_, siblingData) => siblingData.productType === 'sized'
      },
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true
        },
        {
          name: 'stock',
          type: 'number',
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
      required: true,
      defaultValue: 'in_stock',
      options: [
        {
          label: 'In stock',
          value: 'in_stock'
        },
        {
          label: 'Preorder',
          value: 'preorder'
        },
        {
          label: 'Sold out',
          value: 'sold_out'
        },
        {
          label: 'Hidden',
          value: 'hidden'
        }
      ]
    },
    {
      name: 'preorderNote',
      type: 'text',
      admin: {
        condition: (data) => data.saleStatus === 'preorder'
      }
    },
    {
      name: 'shortDescription',
      type: 'textarea',
      required: true
    },
    {
      name: 'description',
      type: 'textarea',
      required: true
    },
    {
      name: 'published',
      type: 'checkbox',
      defaultValue: false
    }
  ]
}
