import type { CollectionConfig } from 'payload'

import { adminsAndEditors, anyone } from '../access'

export const Media: CollectionConfig = {
  slug: 'media',
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
      required: true
    }
  ]
}
