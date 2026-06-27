import type { GlobalConfig } from 'payload'

import { admins } from '../access'

// Настройки приёма оплаты по СБП и уведомления о заказе через Make. Только для админов
// (не редакторов): это секреты, равные по силе доступу к деньгам магазина. Значения из
// админки имеют приоритет над переменными окружения (MAKE_*) — пустое поле означает «брать из env».
export const IntegrationSettings: GlobalConfig = {
  slug: 'integration-settings',
  label: 'Интеграции: оплата и уведомления',
  access: {
    read: admins,
    update: admins
  },
  admin: {
    description:
      'Make (уведомление о заказе) и СБП (приём оплаты). Заполненные здесь значения имеют приоритет над переменными окружения; ' +
      'пустые поля — используются переменные окружения с сервера. Изменения применяются без перезапуска (до 30 секунд).'
  },
  fields: [
    {
      name: 'make',
      type: 'group',
      label: 'Make (уведомление о заказе)',
      admin: {
        description:
          'Custom webhook сценария Make: получает заказ + PDF-чек и пересылает в Telegram. Бот и чат настраиваются внутри Make.'
      },
      fields: [
        {
          name: 'webhookUrl',
          type: 'text',
          label: 'URL вебхука Make',
          admin: {
            placeholder: 'https://hook.eu2.make.com/…',
            description:
              'Единственное обязательное поле для подключения. В Make создай сценарий с триггером «Custom webhook» и вставь сюда выданный URL — на него уходит заказ + PDF-чек.'
          }
        },
        { name: 'webhookSecret', type: 'text', label: 'Секрет вебхука (опц.)', admin: { description: 'Шлём заголовком X-Bigstep-Secret; проверь его в сценарии Make.' } }
      ]
    },
    {
      name: 'sbp',
      type: 'group',
      label: 'СБП (приём оплаты)',
      fields: [
        { name: 'qrImage', type: 'upload', relationTo: 'media', label: 'QR СБП (картинка)' },
        { name: 'recipientHint', type: 'text', label: 'Подпись получателя в окне оплаты', admin: { placeholder: 'Степан Г., Т-Банк' } },
        { name: 'expectedRecipientName', type: 'text', label: 'Эталон имени получателя (для сверки чека)' },
        { name: 'expectedPhoneTail', type: 'text', label: 'Последние цифры телефона/счёта (для сверки)' },
        { name: 'alfaLink', type: 'text', label: 'Ссылка на оплату — Альфа Банк', admin: { placeholder: 'https://…' } },
        { name: 'tbankLink', type: 'text', label: 'Ссылка на оплату — Т-Банк', admin: { placeholder: 'https://…' } },
        { name: 'sberLink', type: 'text', label: 'Ссылка на оплату — Сбер', admin: { placeholder: 'https://…' } }
      ]
    }
  ]
}
