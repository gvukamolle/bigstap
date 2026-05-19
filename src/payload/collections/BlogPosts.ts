import type { CollectionConfig } from 'payload'
import { lexicalEditor } from '@payloadcms/richtext-lexical'

import { adminsAndEditors, staffOrPublished } from '../access'

export const BlogPosts: CollectionConfig = {
  slug: 'blog-posts',
  admin: {
    useAsTitle: 'title'
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
      required: true
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true
    },
    {
      name: 'excerpt',
      type: 'textarea',
      required: true
    },
    {
      name: 'category',
      type: 'text'
    },
    {
      name: 'content',
      type: 'richText',
      editor: lexicalEditor({})
    },
    {
      name: 'relatedProducts',
      type: 'relationship',
      relationTo: 'products',
      hasMany: true
    },
    {
      name: 'relatedEvents',
      type: 'relationship',
      relationTo: 'events',
      hasMany: true
    },
    {
      name: 'published',
      type: 'checkbox',
      defaultValue: false
    }
  ]
}
