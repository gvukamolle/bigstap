import type { CollectionConfig, PayloadRequest } from 'payload'
import { lexicalEditor } from '@payloadcms/richtext-lexical'

import { isValidProductSlug } from '../../domain/products'
import { slugify } from '../../lib/slug'
import { adminsAndEditors, staffOrPublished } from '../access'

// Адрес статьи генерируется из названия и не вводится вручную. Существующий адрес
// сохраняется при редактировании, чтобы не ломать ссылки на опубликованные статьи.
const generateUniqueSlug = async (
  req: PayloadRequest,
  title: string,
  currentId: string | number | undefined
): Promise<string> => {
  const base = slugify(title) || 'statya'
  let candidate = base
  let suffix = 2

  for (let guard = 0; guard < 1000; guard += 1) {
    const existing = await req.payload.find({
      collection: 'blog-posts',
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

export const BlogPosts: CollectionConfig = {
  slug: 'blog-posts',
  labels: {
    singular: 'Статья',
    plural: 'Статьи'
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'published']
  },
  access: {
    create: adminsAndEditors,
    read: staffOrPublished,
    update: adminsAndEditors,
    delete: adminsAndEditors
  },
  hooks: {
    beforeValidate: [
      async ({ data, originalDoc, req }) => {
        if (!data) return data

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
      // Адрес ссылки на статью. Заполняется автоматически из названия, скрыт из формы.
      name: 'slug',
      type: 'text',
      label: 'Адрес',
      required: true,
      unique: true,
      admin: { hidden: true },
      validate: (value: unknown) =>
        isValidProductSlug(value) ||
        'Адрес: только строчные латинские буквы, цифры и дефис, например interview-01.'
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      label: 'Обложка'
    },
    {
      name: 'content',
      type: 'richText',
      label: 'Текст',
      editor: lexicalEditor({}),
      admin: {
        description: 'Содержимое статьи. Открывается на странице после клика по карточке.'
      }
    },
    {
      name: 'externalUrl',
      type: 'text',
      label: 'Ссылка на интервью (внешняя)',
      admin: {
        description:
          'Если заполнено, в ленте и на странице статьи появится кнопка «Читать по ссылке». Допустимы только адреса, начинающиеся с http:// или https://.'
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
