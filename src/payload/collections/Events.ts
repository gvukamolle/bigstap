import type { CollectionConfig } from 'payload'

import { adminsAndEditors, staffOrPublished } from '../access'

export const Events: CollectionConfig = {
  slug: 'events',
  labels: {
    singular: 'Ивент',
    plural: 'Ивенты'
  },
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
      name: 'dateLabel',
      type: 'text',
      label: 'Дата для вывода',
      required: true
    },
    {
      name: 'location',
      type: 'text',
      label: 'Место',
      required: true
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Описание',
      required: true
    },
    {
      name: 'socialLink',
      type: 'text',
      label: 'Ссылка на соцсети'
    },
    {
      name: 'published',
      type: 'checkbox',
      label: 'Опубликовано',
      defaultValue: false
    }
  ]
}
