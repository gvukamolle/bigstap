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

const databaseUri =
  process.env.DATABASE_URI ?? 'postgres://bigstep:bigstep@localhost:5432/bigstep'

const getPayloadSecret = () => {
  if (process.env.PAYLOAD_SECRET) {
    return process.env.PAYLOAD_SECRET
  }

  const isNextProductionBuild = process.env.NEXT_PHASE === 'phase-production-build'

  if (process.env.NODE_ENV === 'production' && !isNextProductionBuild) {
    throw new Error('PAYLOAD_SECRET is required in production')
  }

  return 'bigstep-local-development-secret'
}

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
  secret: getPayloadSecret(),
  sharp
})
