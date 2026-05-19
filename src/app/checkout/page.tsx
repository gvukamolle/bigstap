import { CheckoutClient } from '@/components/CheckoutClient'

export default function CheckoutPage() {
  return (
    <div className="page">
      <section className="shopIntro">
        <span className="eyebrow">Checkout</span>
        <h1 className="display">Оформление</h1>
        <p>Прототип оформления: контакты, пункт выдачи СДЭК и заглушка оплаты YooKassa.</p>
      </section>

      <CheckoutClient />
    </div>
  )
}
