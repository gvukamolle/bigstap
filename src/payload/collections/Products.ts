import type { CollectionConfig } from 'payload'

import { admins, anyone } from '../access'

export const Products: CollectionConfig = {
  slug: 'products',
  admin: {
    useAsTitle: 'title'
  },
  access: {
    create: admins,
    read: anyone,
    update: admins,
    delete: admins
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
