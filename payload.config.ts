import path from 'node:path'

import { postgresAdapter } from '@payloadcms/db-postgres'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { ru } from '@payloadcms/translations/languages/ru'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { BlogPosts } from './src/payload/collections/BlogPosts'
import { Events } from './src/payload/collections/Events'
import { Media } from './src/payload/collections/Media'
import { Orders } from './src/payload/collections/Orders'
import { Products } from './src/payload/collections/Products'
import { Users } from './src/payload/collections/Users'
import { SiteSettings } from './src/payload/globals/SiteSettings'

const isProductionRuntime =
  process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build'

const requireRuntimeEnv = (name: 'PAYLOAD_SECRET') => {
  const value = process.env[name]
  if (value && value.length >= 16) return value

  if (isProductionRuntime) {
    throw new Error(`Environment variable ${name} must be set to a strong value in production.`)
  }

  return 'bigstep-local-development-secret'
}

const usePostgres = Boolean(process.env.DATABASE_URI)
const payloadDb = usePostgres
  ? postgresAdapter({
      pool: {
        connectionString: process.env.DATABASE_URI ?? ''
      }
    })
  : sqliteAdapter({
      client: {
        url: process.env.SQLITE_DATABASE_URL ?? 'file:payload-local.db'
      },
      // Auto-sync is fine in dev (no migrations workflow), but unsafe in prod: silent schema drift can lose data.
      push: !isProductionRuntime
    })

const adminRu = {
  ...ru,
  translations: {
    ...ru.translations,
    general: {
      ...ru.translations.general,
      email: 'Почта',
      emailAddress: 'Почта',
      collections: 'Разделы',
      allCollections: 'Все разделы',
      globals: 'Настройки',
      dashboard: 'Панель'
    }
  }
}

export default buildConfig({
  admin: {
    components: {
      beforeDashboard: ['@/payload/admin/BigstepDashboardIntro'],
      beforeNav: ['@/payload/admin/BigstepNavBrand'],
      graphics: {
        Icon: '@/payload/admin/BigstepIcon',
        Logo: '@/payload/admin/BigstepLogo'
      },
      providers: ['@/payload/admin/BigstepAdminProvider']
    },
    importMap: {
      importMapFile: path.resolve(process.cwd(), 'src/app/(payload)/admin/importMap.ts')
    },
    meta: {
      icons: { icon: '/favicon.ico' },
      titleSuffix: ' | Grushko Stepan'
    },
    theme: 'light',
    user: Users.slug
  },
  collections: [Users, Media, Products, Orders, BlogPosts, Events],
  globals: [SiteSettings],
  db: payloadDb,
  editor: lexicalEditor(),
  i18n: {
    fallbackLanguage: 'ru',
    supportedLanguages: { ru: adminRu }
  },
  secret: requireRuntimeEnv('PAYLOAD_SECRET'),
  sharp
})
