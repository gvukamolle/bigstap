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

const isNextProductionBuild = () => process.env.NEXT_PHASE === 'phase-production-build'
const isProductionRuntime = () =>
  process.env.NODE_ENV === 'production' && !isNextProductionBuild()

const getRuntimeEnv = (name: 'DATABASE_URI' | 'PAYLOAD_SECRET', localFallback: string) => {
  const value = process.env[name]

  if (value) {
    return value
  }

  if (isProductionRuntime()) {
    throw new Error(`${name} is required in production`)
  }

  return localFallback
}

const usePostgres = Boolean(process.env.DATABASE_URI) || isProductionRuntime()
const payloadDb = usePostgres
  ? postgresAdapter({
      pool: {
        connectionString: getRuntimeEnv('DATABASE_URI', '')
      }
    })
  : sqliteAdapter({
      client: {
        url: process.env.SQLITE_DATABASE_URL ?? 'file:payload-local.db'
      },
      push: true
    })

const adminRu = {
  ...ru,
  translations: {
    ...ru.translations,
    general: {
      ...ru.translations.general,
      email: 'Почта',
      emailAddress: 'Почта'
    }
  }
}

export default buildConfig({
  admin: {
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
  secret: getRuntimeEnv('PAYLOAD_SECRET', 'bigstep-local-development-secret'),
  sharp
})
