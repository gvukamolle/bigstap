import type { GlobalConfig } from 'payload'

import { admins, adminsAndEditors } from '../access'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Настройки сайта',
  // No public consumer reads this global yet. When the storefront starts using it, expose individual
  // fields via a thin API route rather than reopening the whole global to anonymous traffic.
  access: {
    read: adminsAndEditors,
    update: admins
  },
  fields: [
    {
      name: 'siteName',
      type: 'text',
      label: 'Название сайта',
      required: true,
      defaultValue: 'Grushko Stepan'
    },
    {
      name: 'heroLink',
      type: 'text',
      label: 'Ссылка с фото на главной',
      defaultValue: '/shop',
      admin: {
        description:
          'Куда ведёт клик по большому фото на главной. Внутренний путь («/shop/test-01») или полный URL. Пусто или некорректно — откроется магазин.'
      }
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
