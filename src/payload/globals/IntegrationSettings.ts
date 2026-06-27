import type { GlobalConfig } from 'payload'

import { admins } from '../access'

// Ключи платёжных и логистических API. Только для админов (не редакторов): это секреты,
// равные по силе доступу к деньгам магазина. Значения из админки имеют приоритет над
// переменными окружения (MAKE_*, CDEK_*) — пустое поле означает «брать из env».
export const IntegrationSettings: GlobalConfig = {
  slug: 'integration-settings',
  label: 'Интеграции: оплата и доставка',
  access: {
    read: admins,
    update: admins
  },
  admin: {
    description:
      'Make, СБП и СДЭК. Заполненные здесь значения имеют приоритет над переменными окружения; ' +
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
        { name: 'webhookUrl', type: 'text', label: 'URL вебхука Make', admin: { placeholder: 'https://hook.eu2.make.com/…' } },
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
        { name: 'expectedPhoneTail', type: 'text', label: 'Последние цифры телефона/счёта (для сверки)' }
      ]
    },
    {
      name: 'cdek',
      type: 'group',
      label: 'СДЭК (доставка до ПВЗ)',
      admin: {
        description:
          'Личный кабинет СДЭК → Интеграции → API. Нужны идентификатор клиента (Account) и секретный ключ (Secure password).'
      },
      fields: [
        {
          name: 'clientId',
          type: 'text',
          label: 'Идентификатор клиента (Account)'
        },
        {
          name: 'clientSecret',
          type: 'text',
          label: 'Секретный ключ (Secure password)'
        },
        {
          name: 'apiMode',
          type: 'select',
          label: 'Контур API',
          defaultValue: 'prod',
          options: [
            { label: 'Боевой (api.cdek.ru)', value: 'prod' },
            { label: 'Тестовый (api.edu.cdek.ru)', value: 'test' }
          ],
          admin: {
            description: 'Тестовый контур — для проверки интеграции, реальные заказы не создаются.'
          }
        }
      ]
    }
  ]
}
