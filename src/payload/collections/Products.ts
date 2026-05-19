import type { CollectionConfig } from 'payload'

import { admins, staffOrPublishedProduct } from '../access'

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

const isFiniteNonNegative = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0

const validateProductInvariants = (product: ProductData) => {
  const productType = product.productType ?? 'sized'

  if (
    typeof product.salePrice === 'number' &&
    typeof product.price === 'number' &&
    product.salePrice > product.price
  ) {
    throw new Error('Sale price cannot be greater than price.')
  }

  if (productType === 'one_size' && !isFiniteNonNegative(product.stock)) {
    throw new Error('One-size products require stock of 0 or greater.')
  }

  if (productType === 'sized') {
    if (!Array.isArray(product.sizes) || product.sizes.length === 0) {
      throw new Error('Sized products require at least one size.')
    }

    const invalidSize = product.sizes.some(
      (size) =>
        typeof size.label !== 'string' ||
        !size.label.trim() ||
        !isFiniteNonNegative(size.stock)
    )

    if (invalidSize) {
      throw new Error('Each size requires a label and stock of 0 or greater.')
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
      min: 0
    },
    {
      name: 'salePrice',
      type: 'number',
      min: 0
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
          min: 0
        }
      ]
    },
    {
      name: 'stock',
      type: 'number',
      min: 0,
      admin: {
        condition: (_, siblingData) => siblingData.productType === 'one_size'
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
