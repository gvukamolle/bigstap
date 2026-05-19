import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
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

const getRuntimeEnv = (name: 'DATABASE_URI' | 'PAYLOAD_SECRET', localFallback: string) => {
  const value = process.env[name]

  if (value) {
    return value
  }

  if (process.env.NODE_ENV === 'production' && !isNextProductionBuild()) {
    throw new Error(`${name} is required in production`)
  }

  return localFallback
}

const databaseUri = getRuntimeEnv(
  'DATABASE_URI',
  'postgres://bigstep:bigstep@localhost:5432/bigstep'
)

export default buildConfig({
  admin: {
    user: Users.slug
  },
  collections: [Users, Media, Products, Orders, BlogPosts, Events],
  globals: [SiteSettings],
  db: postgresAdapter({
    pool: {
      connectionString: databaseUri
    }
  }),
  editor: lexicalEditor(),
  secret: getRuntimeEnv('PAYLOAD_SECRET', 'bigstep-local-development-secret'),
  sharp
})
