import type { CollectionConfig } from 'payload'

import { adminsAndEditors, anyone } from '../access'

export const Events: CollectionConfig = {
  slug: 'events',
  admin: {
    useAsTitle: 'title'
  },
  access: {
    create: adminsAndEditors,
    read: anyone,
    update: adminsAndEditors,
    delete: adminsAndEditors
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
      name: 'dateLabel',
      type: 'text',
      required: true
    },
    {
      name: 'location',
      type: 'text',
      required: true
    },
    {
      name: 'description',
      type: 'textarea',
      required: true
    },
    {
      name: 'socialLink',
      type: 'text'
    },
    {
      name: 'published',
      type: 'checkbox',
      defaultValue: false
    }
  ]
}
