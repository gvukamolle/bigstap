import type { CollectionConfig } from 'payload'

import { admins } from '../access'

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
  fields: [
    {
      name: 'orderNumber',
      type: 'text',
      required: true
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
      type: 'text'
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
