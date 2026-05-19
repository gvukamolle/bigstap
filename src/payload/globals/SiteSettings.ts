import type { GlobalConfig } from 'payload'

import { admins, anyone } from '../access'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  access: {
    read: anyone,
    update: admins
  },
  fields: [
    {
      name: 'siteName',
      type: 'text',
      required: true,
      defaultValue: 'BIGSTEP.RU'
    },
    {
      name: 'socialLinks',
      type: 'array',
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true
        },
        {
          name: 'href',
          type: 'text',
          required: true
        }
      ]
    }
  ]
}
