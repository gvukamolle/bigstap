import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Оплата заказа',
  robots: { index: false }
}

// Страница возврата покупателя из ЮKassa. ВАЖНО: факт возврата НЕ означает успешную оплату —
// финальный статус заказа выставляется только вебхуком payment.succeeded после перепроверки.
export default async function CheckoutReturnPage({
  searchParams
}: {
  searchParams: Promise<{ order?: string }>
}) {
  const { order } = await searchParams

  return (
    <div className="page">
      <article className="article">
        <h1 className="display">Спасибо</h1>
        <p>
          {order ? (
            <>
              Заказ <strong>{order}</strong>.{' '}
            </>
          ) : null}
          Если оплата прошла успешно, статус заказа обновится автоматически после подтверждения от
          платёжной системы. Мы свяжемся с вами по указанным контактам.
        </p>
        <p>
          Возврат на эту страницу не подтверждает оплату — итоговый статус определяется уведомлением
          ЮKassa.
        </p>
        <Link className="button" href="/shop" prefetch={false}>
          Вернуться в магазин
        </Link>
      </article>
    </div>
  )
}
