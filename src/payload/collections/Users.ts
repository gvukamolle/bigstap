import type { CollectionConfig } from 'payload'

import { admins } from '../access'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: 'Пользователь',
    plural: 'Пользователи'
  },
  auth: true,
  admin: {
    useAsTitle: 'email'
  },
  access: {
    create: admins,
    read: admins,
    update: admins,
    delete: admins
  },
  hooks: {
    beforeValidate: [
      async ({ data, operation, req }) => {
        if (operation !== 'create') {
          return data
        }

        const userCount = await req.payload.count({
          collection: 'users',
          req,
          overrideAccess: true
        })

        return {
          ...data,
          role: userCount.totalDocs === 0 ? 'admin' : (data?.role ?? 'editor')
        }
      }
    ]
  },
  fields: [
    {
      name: 'role',
      type: 'select',
      label: 'Роль',
      required: true,
      defaultValue: 'editor',
      options: [
        {
          label: 'Администратор',
          value: 'admin'
        },
        {
          label: 'Редактор',
          value: 'editor'
        }
      ]
    }
  ]
}
