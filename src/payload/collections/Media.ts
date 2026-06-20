import type { CollectionConfig } from 'payload'

import { adminsAndEditors, anyone } from '../access'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: {
    singular: 'Медиа',
    plural: 'Медиа'
  },
  admin: {
    hidden: true
  },
  upload: true,
  access: {
    create: adminsAndEditors,
    read: anyone,
    update: adminsAndEditors,
    delete: adminsAndEditors
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      label: 'Описание изображения',
      admin: {
        description: 'Необязательно. Если не заполнить — подставится название товара.'
      }
    }
  ]
}
