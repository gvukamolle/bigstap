import type { CollectionConfig } from 'payload'

import { hasValidBootstrapCookie } from '../../lib/bootstrapTicket'
import { admins } from '../access'

const isProductionRuntime = () =>
  process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: 'Пользователь',
    plural: 'Пользователи'
  },
  auth: {
    loginWithUsername: {
      allowEmailLogin: true,
      requireEmail: false,
      requireUsername: true
    }
  },
  admin: {
    useAsTitle: 'username'
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
        const isFirstUser = userCount.totalDocs === 0

        // Defense-in-depth поверх proxy.ts: первого администратора в production можно создать
        // только при валидном bootstrap-тикете в cookie. Если proxy промахнётся по matcher —
        // сервер всё равно не даст создать первого пользователя публично.
        if (isFirstUser && isProductionRuntime()) {
          const token = process.env.PAYLOAD_BOOTSTRAP_TOKEN
          const cookieHeader = req.headers.get('cookie') ?? null

          if (!token || !(await hasValidBootstrapCookie(cookieHeader, token, Date.now()))) {
            throw new Error(
              'Создание первого пользователя недоступно без валидного bootstrap-доступа.'
            )
          }
        }

        return {
          ...data,
          role: isFirstUser ? 'admin' : (data?.role ?? 'editor')
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
