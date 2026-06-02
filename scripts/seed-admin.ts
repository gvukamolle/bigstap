import process from 'node:process'

import { createClient } from '@libsql/client'
import nextEnv from '@next/env'
import { getPayload } from 'payload'

import { products } from '../src/data/products'
import type { Product } from '../src/domain/products'
import { getSeedAdminCredentials } from '../src/payload/seedAdminCredentials'

const { loadEnvConfig } = nextEnv

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production')

const ensureLocalSqliteUsernameColumn = async (): Promise<boolean> => {
  if (process.env.DATABASE_URI) return false

  const url = process.env.SQLITE_DATABASE_URL ?? 'file:payload-local.db'
  if (!url.startsWith('file:')) return false

  const client = createClient({ url })

  try {
    const table = await client.execute(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'"
    )

    if (table.rows.length === 0) return false

    const columns = await client.execute('PRAGMA table_info(users)')
    const hasUsername = columns.rows.some((row) => row.name === 'username')

    if (!hasUsername) {
      await client.execute('ALTER TABLE users ADD COLUMN username TEXT')
    }

    await client.execute(
      "UPDATE users SET username = email WHERE username IS NULL OR username = ''"
    )

    return true
  } finally {
    client.close()
  }
}

const ensureColumn = async (
  client: ReturnType<typeof createClient>,
  tableName: string,
  columnName: string,
  columnDefinition: string
) => {
  const columns = await client.execute(`PRAGMA table_info(${tableName})`)
  const hasColumn = columns.rows.some((row) => row.name === columnName)

  if (!hasColumn) {
    await client.execute(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`)
  }
}

const ensureLocalSqliteProductColumns = async (): Promise<boolean> => {
  if (process.env.DATABASE_URI) return false

  const url = process.env.SQLITE_DATABASE_URL ?? 'file:payload-local.db'
  if (!url.startsWith('file:')) return false

  const client = createClient({ url })

  try {
    const table = await client.execute(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'products'"
    )

    if (table.rows.length === 0) return false

    await ensureColumn(client, 'products', 'drop_name', 'TEXT')
    await ensureColumn(client, 'products', 'image_url', 'TEXT')
    await ensureColumn(client, 'products', 'image_alt', 'TEXT')
    await ensureColumn(client, 'products', 'image_tone', 'TEXT')

    return true
  } finally {
    client.close()
  }
}

function productData(product: Product) {
  const base = {
    category: product.category,
    description: product.description,
    dropName: product.dropName,
    imageAlt: product.image.alt,
    imageTone: product.imageTone,
    imageUrl: product.image.src,
    preorderNote: product.preorderNote,
    price: product.price,
    productType: product.type,
    published: product.published,
    salePrice: product.salePrice,
    saleStatus: product.saleStatus,
    shortDescription: product.shortDescription,
    slug: product.slug,
    title: product.title
  }

  if (product.type === 'one_size') {
    return {
      ...base,
      stock: product.stock
    }
  }

  return {
    ...base,
    sizes: product.sizes.map((size) => ({ label: size.label, stock: size.stock }))
  }
}

const seedAdmin = async () => {
  const { email, password, username } = getSeedAdminCredentials()
  const hasExistingLocalUsersTable = await ensureLocalSqliteUsernameColumn()
  const hasExistingLocalProductsTable = await ensureLocalSqliteProductColumns()

  if (
    (hasExistingLocalUsersTable || hasExistingLocalProductsTable) &&
    process.env.NODE_ENV !== 'production'
  ) {
    Object.assign(process.env, { NODE_ENV: 'production' })
  }

  const { default: config } = await import('@payload-config')
  const payload = await getPayload({ config })

  const existing = await payload.find({
    collection: 'users',
    limit: 1,
    overrideAccess: true,
    where: {
      or: [{ username: { equals: username } }, { email: { equals: email } }]
    }
  })

  const data = {
    email,
    password,
    role: 'admin' as const,
    username
  }

  if (existing.docs[0]) {
    await payload.update({
      collection: 'users',
      data,
      id: existing.docs[0].id,
      overrideAccess: true
    })
    payload.logger.info(`Seed admin updated: ${username}`)
  } else {
    await payload.create({
      collection: 'users',
      data,
      overrideAccess: true
    })
    payload.logger.info(`Seed admin created: ${username}`)
  }

  for (const product of products) {
    const existingProduct = await payload.find({
      collection: 'products',
      limit: 1,
      overrideAccess: true,
      where: { slug: { equals: product.slug } }
    })

    const data = productData(product)

    if (existingProduct.docs[0]) {
      await payload.update({
        collection: 'products',
        data,
        id: existingProduct.docs[0].id,
        overrideAccess: true
      })
      payload.logger.info(`Seed product updated: ${product.slug}`)
    } else {
      await payload.create({
        collection: 'products',
        data,
        overrideAccess: true
      })
      payload.logger.info(`Seed product created: ${product.slug}`)
    }
  }

  const legacyPlaceholders = await payload.find({
    collection: 'products',
    limit: 10,
    overrideAccess: true,
    where: {
      or: [
        { slug: { equals: 'test-1' } },
        { slug: { equals: '?' } },
        { title: { equals: 'Test 1' } },
        { title: { equals: 'Тест 1' } }
      ]
    }
  })

  for (const product of legacyPlaceholders.docs) {
    if (products.some((item) => item.slug === product.slug)) continue

    await payload.update({
      collection: 'products',
      data: {
        dropName: product.title,
        imageAlt: `${product.title} Grushko Stepan`,
        imageTone: 'black',
        imageUrl: '/images/bigstep/test-00-front.jpg',
        published: false
      },
      id: product.id,
      overrideAccess: true
    })
    payload.logger.info(`Legacy placeholder unpublished: ${product.slug}`)
  }

  await payload.destroy()
}

seedAdmin().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
