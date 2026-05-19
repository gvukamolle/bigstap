import type { CollectionConfig } from 'payload'

import { admins } from '../access'

const MAX_RUB_AMOUNT = 10_000_000
const MAX_QUANTITY = 100

type OrderItemData = {
  lineTotal?: number | null
  productSlug?: string | null
  productTitle?: string | null
  quantity?: number | null
  saleStatus?: 'in_stock' | 'preorder' | null
  unitPrice?: number | null
}

type OrderData = {
  amount?: number | null
  currency?: string | null
  items?: OrderItemData[] | null
}

const isSafeIntegerInRange = (value: unknown, max: number, min = 0): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max

const validateOrderInvariants = (order: OrderData) => {
  if (!isSafeIntegerInRange(order.amount, MAX_RUB_AMOUNT)) {
    throw new Error('Сумма заказа должна быть целым числом в рублях.')
  }

  if (order.currency !== 'RUB') {
    throw new Error('MVP поддерживает только валюту RUB.')
  }

  if (!Array.isArray(order.items) || order.items.length === 0) {
    throw new Error('Заказ должен содержать минимум одну позицию.')
  }

  const itemsTotal = order.items.reduce((total, item) => {
    if (
      typeof item.productTitle !== 'string' ||
      !item.productTitle.trim() ||
      typeof item.productSlug !== 'string' ||
      !item.productSlug.trim()
    ) {
      throw new Error('Каждая позиция заказа должна хранить название и slug товара.')
    }

    if (!isSafeIntegerInRange(item.quantity, MAX_QUANTITY, 1)) {
      throw new Error('Количество в позиции заказа должно быть целым числом от 1 до 100.')
    }

    if (!isSafeIntegerInRange(item.unitPrice, MAX_RUB_AMOUNT)) {
      throw new Error('Цена позиции должна быть целым числом в рублях.')
    }

    if (item.saleStatus !== 'in_stock' && item.saleStatus !== 'preorder') {
      throw new Error('Позиция заказа должна хранить статус наличия или предзаказа.')
    }

    const expectedLineTotal = item.unitPrice * item.quantity

    if (item.lineTotal !== expectedLineTotal) {
      throw new Error('Сумма позиции заказа должна совпадать с ценой, умноженной на количество.')
    }

    return total + expectedLineTotal
  }, 0)

  if (itemsTotal !== order.amount) {
    throw new Error('Сумма заказа должна совпадать с суммой позиций.')
  }
}

export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    useAsTitle: 'orderNumber'
  },
  access: {
    create: admins,
    read: admins,
    update: admins,
    delete: admins
  },
  hooks: {
    beforeValidate: [
      ({ data, originalDoc }) => {
        validateOrderInvariants({
          ...(originalDoc as OrderData | undefined),
          ...(data as OrderData | undefined)
        })

        return data
      }
    ]
  },
  fields: [
    {
      name: 'orderNumber',
      type: 'text',
      required: true,
      unique: true
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending_payment',
      options: [
        'draft',
        'pending_payment',
        'paid',
        'payment_failed',
        'processing',
        'ready_for_cdek',
        'shipped',
        'completed',
        'cancelled',
        'refunded'
      ]
    },
    {
      name: 'customerName',
      type: 'text',
      required: true
    },
    {
      name: 'customerPhone',
      type: 'text',
      required: true
    },
    {
      name: 'customerEmail',
      type: 'email',
      required: true
    },
    {
      name: 'cdekPickupCode',
      type: 'text'
    },
    {
      name: 'cdekPickupAddress',
      type: 'text'
    },
    {
      name: 'paymentId',
      type: 'text',
      unique: true
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
      min: 0,
      max: MAX_RUB_AMOUNT,
      admin: {
        step: 1
      }
    },
    {
      name: 'currency',
      type: 'text',
      required: true,
      defaultValue: 'RUB'
    },
    {
      name: 'items',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        {
          name: 'product',
          type: 'relationship',
          relationTo: 'products',
          required: true
        },
        {
          name: 'productTitle',
          type: 'text',
          required: true
        },
        {
          name: 'productSlug',
          type: 'text',
          required: true
        },
        {
          name: 'sizeLabel',
          type: 'text'
        },
        {
          name: 'quantity',
          type: 'number',
          required: true,
          min: 1,
          max: MAX_QUANTITY,
          admin: {
            step: 1
          }
        },
        {
          name: 'unitPrice',
          type: 'number',
          required: true,
          min: 0,
          max: MAX_RUB_AMOUNT,
          admin: {
            step: 1
          }
        },
        {
          name: 'lineTotal',
          type: 'number',
          required: true,
          min: 0,
          max: MAX_RUB_AMOUNT,
          admin: {
            step: 1
          }
        },
        {
          name: 'saleStatus',
          type: 'select',
          required: true,
          options: [
            {
              label: 'В наличии',
              value: 'in_stock'
            },
            {
              label: 'Предзаказ',
              value: 'preorder'
            }
          ]
        }
      ]
    },
    {
      name: 'trackingNumber',
      type: 'text'
    },
    {
      name: 'adminNotes',
      type: 'textarea'
    }
  ]
}
