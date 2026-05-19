import type { CollectionConfig } from 'payload'
import { lexicalEditor } from '@payloadcms/richtext-lexical'

import { adminsAndEditors, staffOrPublished } from '../access'

export const BlogPosts: CollectionConfig = {
  slug: 'blog-posts',
  labels: {
    singular: 'Статья',
    plural: 'Статьи'
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'published']
  },
  access: {
    create: adminsAndEditors,
    read: staffOrPublished,
    update: adminsAndEditors,
    delete: adminsAndEditors
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Название',
      required: true
    },
    {
      name: 'slug',
      type: 'text',
      label: 'Адрес',
      required: true,
      unique: true
    },
    {
      name: 'excerpt',
      type: 'textarea',
      label: 'Анонс',
      required: true
    },
    {
      name: 'category',
      type: 'text',
      label: 'Категория'
    },
    {
      name: 'image',
      type: 'relationship',
      label: 'Обложка',
      relationTo: 'media'
    },
    {
      name: 'content',
      type: 'richText',
      label: 'Текст',
      editor: lexicalEditor({})
    },
    {
      name: 'relatedProducts',
      type: 'relationship',
      label: 'Связанные товары',
      relationTo: 'products',
      hasMany: true
    },
    {
      name: 'relatedEvents',
      type: 'relationship',
      label: 'Связанные ивенты',
      relationTo: 'events',
      hasMany: true
    },
    {
      name: 'published',
      type: 'checkbox',
      label: 'Опубликовано',
      defaultValue: false
    }
  ]
}
