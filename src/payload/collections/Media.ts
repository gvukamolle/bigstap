import type { CollectionConfig } from 'payload'

import { adminsAndEditors, anyone } from '../access'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: {
    singular: 'Медиа',
    plural: 'Медиа'
  },
  admin: {
    hidden: true
  },
  upload: {
    // HEIC (формат фото с iPhone) браузеры не отображают, а sharp в пребилд-сборке
    // умеет декодировать из HEIF только AVIF — серверная конвертация HEIC невозможна.
    // Поэтому принимаем лишь то, что реально рендерится в браузере. Фото с айфона
    // нужно сохранять как JPEG («Самый совместимый» в Настройки → Камера → Форматы).
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    // Ужимаем оригинал до разумного размера через sharp — чтобы большие фото с телефона
    // быстро грузились и в админке, и в каталоге. Превью в админке Payload строит из
    // самого файла (для JPEG/PNG/WebP работает «из коробки»).
    resizeOptions: { width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }
  },
  access: {
    create: adminsAndEditors,
    read: anyone,
    update: adminsAndEditors,
    delete: adminsAndEditors
  },
  fields: []
}
