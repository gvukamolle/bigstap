import type { GlobalConfig } from 'payload'

import { admins, anyone } from '../access'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Настройки сайта',
  access: {
    read: anyone,
    update: admins
  },
  fields: [
    {
      name: 'siteName',
      type: 'text',
      label: 'Название сайта',
      required: true,
      defaultValue: 'BIGSTEP.RU'
    },
    {
      name: 'socialLinks',
      type: 'array',
      label: 'Ссылки на соцсети',
      labels: {
        singular: 'Ссылка',
        plural: 'Ссылки'
      },
      fields: [
        {
          name: 'label',
          type: 'text',
          label: 'Название',
          required: true
        },
        {
          name: 'href',
          type: 'text',
          label: 'Ссылка',
          required: true
        }
      ]
    }
  ]
}
