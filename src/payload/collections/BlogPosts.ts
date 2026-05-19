import type { CollectionConfig } from 'payload'

import { adminsAndEditors, anyone } from '../access'

export const BlogPosts: CollectionConfig = {
  slug: 'blog-posts',
  admin: {
    useAsTitle: 'title'
  },
  access: {
    create: adminsAndEditors,
    read: anyone,
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
      type: 'textarea'
    },
    {
      name: 'category',
      type: 'text'
    },
    {
      name: 'content',
      type: 'richText',
      required: true
    },
    {
      name: 'published',
      type: 'checkbox',
      defaultValue: false
    }
  ]
}
