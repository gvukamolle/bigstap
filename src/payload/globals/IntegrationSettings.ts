import type { GlobalConfig } from 'payload'

import { admins } from '../access'

// Ключи платёжных и логистических API. Только для админов (не редакторов): это секреты,
// равные по силе доступу к деньгам магазина. Значения из админки имеют приоритет над
// переменными окружения (YOOKASSA_*, CDEK_*) — пустое поле означает «брать из env».
export const IntegrationSettings: GlobalConfig = {
  slug: 'integration-settings',
  label: 'Интеграции: оплата и доставка',
  access: {
    read: admins,
    update: admins
  },
  admin: {
    description:
      'Ключи ЮKassa и СДЭК. Заполненные здесь значения имеют приоритет над переменными окружения; ' +
      'пустые поля — используются переменные окружения с сервера. Изменения применяются без перезапуска (до 30 секунд).'
  },
  fields: [
    {
      name: 'yookassa',
      type: 'group',
      label: 'ЮKassa (приём оплаты)',
      admin: {
        description:
          'Личный кабинет ЮKassa → Интеграции → Ключи API. Нужны shopId магазина и боевой секретный ключ.'
      },
      fields: [
        {
          name: 'shopId',
          type: 'text',
          label: 'shopId магазина',
          admin: { placeholder: 'например 123456' }
        },
        {
          name: 'secretKey',
          type: 'text',
          label: 'Секретный ключ',
          admin: {
            placeholder: 'live_…',
            description: 'Боевой ключ начинается с live_, тестовый — с test_.'
          }
        }
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
