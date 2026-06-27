import type { CollectionConfig, PayloadRequest } from 'payload'

import { isValidProductSlug } from '../../domain/products'
import { slugify } from '../../lib/slug'
import { admins, staffOrPublishedProduct } from '../access'

const MAX_RUB_AMOUNT = 10_000_000
const MAX_STOCK = 100_000

type ProductSize = {
  label?: string | null
  stock?: number | null
}

type ProductData = {
  price?: number | null
  sizes?: ProductSize[] | null
}

const isSafeIntegerInRange = (value: unknown, max: number, min = 0): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max

const validateProductInvariants = (product: ProductData) => {
  if (!isSafeIntegerInRange(product.price, MAX_RUB_AMOUNT)) {
    throw new Error('Цена товара должна быть целым числом в рублях.')
  }

  if (!Array.isArray(product.sizes) || product.sizes.length === 0) {
    throw new Error('Добавьте минимум один размер.')
  }

  const invalidSize = product.sizes.some(
    (size) =>
      typeof size.label !== 'string' ||
      !size.label.trim() ||
      !isSafeIntegerInRange(size.stock, MAX_STOCK)
  )

  if (invalidSize) {
    throw new Error('У каждого размера должны быть название и целый остаток от 0 до 100000.')
  }
}

// Адрес генерируется из названия и больше не вводится вручную. Существующий адрес
// сохраняется при редактировании, чтобы не ломать ссылки на уже опубликованные товары.
const generateUniqueSlug = async (
  req: PayloadRequest,
  title: string,
  currentId: string | number | undefined
): Promise<string> => {
  const base = slugify(title) || 'tovar'
  let candidate = base
  let suffix = 2

  // Перебираем base, base-2, base-3… пока не найдём свободный адрес.
  for (let guard = 0; guard < 1000; guard += 1) {
    const existing = await req.payload.find({
      collection: 'products',
      where: { slug: { equals: candidate } },
      limit: 1,
      depth: 0
    })

    const taken = existing.docs.some((doc) => doc.id !== currentId)
    if (!taken) return candidate

    candidate = `${base}-${suffix}`
    suffix += 1
  }

  return `${base}-${Date.now()}`
}

export const Products: CollectionConfig = {
  slug: 'products',
  labels: {
    singular: 'Товар',
    plural: 'Товары Grushko Stepan'
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'price', 'saleStatus', 'published']
  },
  access: {
    create: admins,
    read: staffOrPublishedProduct,
    update: admins,
    delete: admins
  },
  hooks: {
    beforeValidate: [
      async ({ data, originalDoc, req }) => {
        if (!data) return data

        validateProductInvariants({
          ...(originalDoc as ProductData | undefined),
          ...(data as ProductData | undefined)
        })

        if (!data.slug) {
          const existingSlug =
            originalDoc && typeof (originalDoc as { slug?: unknown }).slug === 'string'
              ? (originalDoc as { slug: string }).slug
              : null

          data.slug =
            existingSlug ??
            (await generateUniqueSlug(
              req,
              String(data.title ?? (originalDoc as { title?: unknown } | undefined)?.title ?? ''),
              (originalDoc as { id?: string | number } | undefined)?.id
            ))
        }

        return data
      }
    ]
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Название',
      required: true
    },
    {
      // Адрес ссылки на товар. Заполняется автоматически из названия (хук beforeValidate),
      // скрыт из формы, чтобы владельцу не приходилось его придумывать.
      name: 'slug',
      type: 'text',
      label: 'Адрес',
      required: true,
      unique: true,
      admin: { hidden: true },
      validate: (value: unknown) =>
        isValidProductSlug(value) ||
        'Адрес: только строчные латинские буквы, цифры и дефис, например test-01.'
    },
    {
      name: 'images',
      type: 'upload',
      relationTo: 'media',
      label: 'Фото',
      hasMany: true,
      required: true,
      minRows: 1,
      admin: {
        description:
          'Первое фото — главное, оно показывается в каталоге. Можно загрузить несколько — остальные станут галереей на странице товара. Форматы: JPEG, PNG или WebP (HEIC с айфона не поддерживается).'
      }
    },
    {
      name: 'price',
      type: 'number',
      label: 'Цена, ₽',
      required: true,
      min: 0,
      max: MAX_RUB_AMOUNT,
      admin: {
        step: 1
      }
    },
    {
      name: 'sizes',
      type: 'array',
      label: 'Размеры',
      labels: {
        singular: 'Размер',
        plural: 'Размеры'
      },
      required: true,
      minRows: 1,
      fields: [
        {
          name: 'label',
          type: 'text',
          label: 'Размер',
          required: true
        },
        {
          name: 'stock',
          type: 'number',
          label: 'Остаток',
          required: true,
          min: 0,
          max: MAX_STOCK,
          admin: {
            step: 1
          }
        }
      ]
    },
    {
      name: 'sizeChart',
      type: 'upload',
      relationTo: 'media',
      label: 'Размерная сетка (картинка)',
      admin: {
        description: 'Необязательно. Картинка с таблицей размеров — покажется на странице товара.'
      }
    },
    {
      name: 'saleStatus',
      type: 'select',
      label: 'Статус продажи',
      required: true,
      defaultValue: 'in_stock',
      options: [
        {
          label: 'В наличии',
          value: 'in_stock'
        },
        {
          label: 'Предзаказ',
          value: 'preorder'
        },
        {
          label: 'Нет в наличии',
          value: 'sold_out'
        },
        {
          label: 'Скрыт',
          value: 'hidden'
        }
      ]
    },
    {
      name: 'preorderNote',
      type: 'text',
      label: 'Комментарий к предзаказу',
      admin: {
        condition: (data) => data.saleStatus === 'preorder'
      }
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Описание',
      required: true,
      admin: {
        description: 'Показывается на странице товара после клика по карточке.'
      }
    },
    {
      name: 'published',
      type: 'checkbox',
      label: 'Опубликовано',
      defaultValue: false
    }
  ]
}
