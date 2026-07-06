'use client'

import { useFormFields } from '@payloadcms/ui'

// ui-поле (не хранится в БД): ссылка на PDF-чек заказа. Файл лежит на диске
// в media/receipts/<orderNumber>.pdf, отдаётся admin-only роутом.
export default function OrderReceiptLink() {
  const orderNumber = useFormFields(([fields]) => fields.orderNumber?.value)

  if (typeof orderNumber !== 'string' || orderNumber.length === 0) return null

  return (
    <div className="field-type">
      <a
        href={`/api/admin/receipts/${encodeURIComponent(orderNumber)}`}
        rel="noreferrer"
        target="_blank"
      >
        Открыть PDF-чек ({orderNumber}.pdf)
      </a>
    </div>
  )
}
