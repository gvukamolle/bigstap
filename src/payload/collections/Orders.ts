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
      required: true,
      unique: true
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'new',
      options: [
        {
          label: 'New',
          value: 'new'
        },
        {
          label: 'Paid',
          value: 'paid'
        },
        {
          label: 'Processing',
          value: 'processing'
        },
        {
          label: 'Shipped',
          value: 'shipped'
        },
        {
          label: 'Delivered',
          value: 'delivered'
        },
        {
          label: 'Cancelled',
          value: 'cancelled'
        }
      ]
    },
    {
      name: 'customer',
      type: 'group',
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true
        },
        {
          name: 'email',
          type: 'email',
          required: true
        },
        {
          name: 'phone',
          type: 'text',
          required: true
        },
        {
          name: 'city',
          type: 'text'
        },
        {
          name: 'address',
          type: 'textarea'
        },
        {
          name: 'comment',
          type: 'textarea'
        }
      ]
    },
    {
      name: 'cdek',
      type: 'group',
      fields: [
        {
          name: 'cityCode',
          type: 'text'
        },
        {
          name: 'deliveryPoint',
          type: 'text'
        },
        {
          name: 'tariffCode',
          type: 'text'
        },
        {
          name: 'address',
          type: 'textarea'
        }
      ]
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
