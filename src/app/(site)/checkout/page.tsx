import { CheckoutClient } from '@/components/CheckoutClient'

export default function CheckoutPage() {
  return (
    <div className="page">
      <section className="shopIntro">
        <span className="eyebrow">Оформление</span>
        <h1 className="display">Оформление</h1>
        <p>Прототип оформления: контакты, пункт выдачи СДЭК и заглушка оплаты Юкасса.</p>
      </section>

      <CheckoutClient />
    </div>
  )
}
