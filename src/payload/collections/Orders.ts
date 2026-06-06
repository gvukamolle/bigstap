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
  deliveryTotal?: number | null
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

  const deliveryTotal = order.deliveryTotal ?? 0
  if (!isSafeIntegerInRange(deliveryTotal, MAX_RUB_AMOUNT)) {
    throw new Error('Доставка должна быть целым числом в рублях.')
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

  if (itemsTotal + deliveryTotal !== order.amount) {
    throw new Error('Сумма заказа должна совпадать с суммой позиций и доставки.')
  }
}

export const Orders: CollectionConfig = {
  slug: 'orders',
  labels: {
    singular: 'Заказ',
    plural: 'Заказы'
  },
  admin: {
    useAsTitle: 'orderNumber',
    defaultColumns: ['orderNumber', 'status', 'customerName', 'amount']
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
      label: 'Номер заказа',
      required: true,
      unique: true
    },
    {
      name: 'status',
      type: 'select',
      label: 'Статус',
      required: true,
      defaultValue: 'pending_payment',
      options: [
        {
          label: 'Черновик',
          value: 'draft'
        },
        {
          label: 'Ожидает оплаты',
          value: 'pending_payment'
        },
        {
          label: 'Оплачен',
          value: 'paid'
        },
        {
          label: 'Ошибка оплаты',
          value: 'payment_failed'
        },
        {
          label: 'В обработке',
          value: 'processing'
        },
        {
          label: 'Готов к СДЭК',
          value: 'ready_for_cdek'
        },
        {
          label: 'Отправлен',
          value: 'shipped'
        },
        {
          label: 'Завершен',
          value: 'completed'
        },
        {
          label: 'Отменен',
          value: 'cancelled'
        },
        {
          label: 'Возврат',
          value: 'refunded'
        }
      ]
    },
    {
      name: 'customerName',
      type: 'text',
      label: 'Имя клиента',
      required: true
    },
    {
      name: 'customerPhone',
      type: 'text',
      label: 'Телефон клиента',
      required: true
    },
    {
      name: 'customerEmail',
      type: 'email',
      label: 'Почта клиента',
      required: true
    },
    {
      name: 'customerCity',
      type: 'text',
      label: 'Город клиента',
      required: true
    },
    {
      name: 'privacyConsentAt',
      type: 'date',
      label: 'Согласие на обработку ПДн (дата)',
      admin: {
        description: 'Фиксация факта и времени согласия покупателя на обработку ПДн (152-ФЗ).'
      }
    },
    {
      name: 'offerAcceptedAt',
      type: 'date',
      label: 'Принятие оферты (дата)'
    },
    {
      name: 'deliveryMethod',
      type: 'select',
      label: 'Способ доставки',
      required: true,
      defaultValue: 'cdek_pickup',
      options: [
        {
          label: 'СДЭК ПВЗ',
          value: 'cdek_pickup'
        }
      ]
    },
    {
      name: 'cdekPickupCode',
      type: 'text',
      label: 'Код пункта СДЭК'
    },
    {
      name: 'cdekPickupName',
      type: 'text',
      label: 'Название пункта СДЭК'
    },
    {
      name: 'cdekPickupCity',
      type: 'text',
      label: 'Город пункта СДЭК'
    },
    {
      name: 'cdekPickupAddress',
      type: 'text',
      label: 'Адрес пункта СДЭК'
    },
    {
      name: 'paymentId',
      type: 'text',
      label: 'ID платежа ЮKassa',
      unique: true
    },
    {
      name: 'npdReceiptStatus',
      type: 'select',
      label: 'Чек НПД («Мой налог»)',
      defaultValue: 'none',
      admin: {
        description:
          'Самозанятый формирует чек НПД отдельно в «Мой налог» — ЮKassa их не делает с 29.12.2025.'
      },
      options: [
        { label: 'Не сформирован', value: 'none' },
        { label: 'Сформирован', value: 'registered' }
      ]
    },
    {
      name: 'npdReceiptUrl',
      type: 'text',
      label: 'Ссылка на чек НПД'
    },
    {
      name: 'deliveryTotal',
      type: 'number',
      label: 'Доставка',
      required: true,
      defaultValue: 0,
      min: 0,
      max: MAX_RUB_AMOUNT,
      admin: {
        step: 1
      }
    },
    {
      name: 'amount',
      type: 'number',
      label: 'Сумма',
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
      label: 'Валюта',
      required: true,
      defaultValue: 'RUB'
    },
    {
      name: 'items',
      type: 'array',
      label: 'Позиции заказа',
      labels: {
        singular: 'Позиция',
        plural: 'Позиции'
      },
      required: true,
      minRows: 1,
      fields: [
        {
          name: 'product',
          type: 'relationship',
          label: 'Товар',
          relationTo: 'products',
          required: true
        },
        {
          name: 'productTitle',
          type: 'text',
          label: 'Название товара',
          required: true
        },
        {
          name: 'productSlug',
          type: 'text',
          label: 'Адрес товара',
          required: true
        },
        {
          name: 'sizeLabel',
          type: 'text',
          label: 'Размер'
        },
        {
          name: 'quantity',
          type: 'number',
          label: 'Количество',
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
          label: 'Цена за единицу',
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
          label: 'Сумма позиции',
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
          label: 'Статус продажи',
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
      type: 'text',
      label: 'Трек-номер'
    },
    {
      name: 'adminNotes',
      type: 'textarea',
      label: 'Заметки админа'
    }
  ]
}
