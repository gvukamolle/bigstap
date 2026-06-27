import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Оплата заказа',
  robots: { index: false }
}

// Заказ принят к ручной проверке оплаты по СБП. Подтверждение оплаты происходит вручную,
// после сверки PDF-чека; о статусе пишем покупателю в Telegram.
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
              Заказ <strong>{order}</strong> принят.{' '}
            </>
          ) : null}
          Проверим оплату по СБП и свяжемся с вами в Telegram.
        </p>
        <Link className="button" href="/shop" prefetch={false}>
          Вернуться в магазин
        </Link>
      </article>
    </div>
  )
}
