import config from '@payload-config'
import type { Metadata } from 'next'
import { getPayload } from 'payload'

import { CheckoutClient } from '@/components/CheckoutClient'
import type { PaymentLink } from '@/components/PaymentModal'
import { getCatalogProducts } from '@/lib/catalog'

export const metadata: Metadata = {
  title: 'Оформление',
  description: 'Прототип оформления заказа Grushko Stepan: контакты, СДЭК и оплата по СБП.',
  robots: { index: false, follow: false }
}

export const dynamic = 'force-dynamic'

type SbpSettings = {
  sbp?: {
    qrImage?: { url?: string | null } | string | number | null
    recipientHint?: string | null
    alfaLink?: string | null
    tbankLink?: string | null
    sberLink?: string | null
  } | null
}

type SbpDisplay = {
  qrImageUrl: string | null
  recipientHint: string | null
  paymentLinks: PaymentLink[]
}

async function readSbpDisplay(): Promise<SbpDisplay> {
  try {
    const payload = await getPayload({ config })
    const settings = (await payload.findGlobal({
      slug: 'integration-settings',
      depth: 1
    })) as SbpSettings
    const sbp = settings?.sbp
    const qrImage = sbp?.qrImage
    const qrImageUrl =
      qrImage && typeof qrImage === 'object' && typeof qrImage.url === 'string' ? qrImage.url : null
    const recipientHint = typeof sbp?.recipientHint === 'string' ? sbp.recipientHint : null
    const paymentLinks = [
      { label: 'Альфа Банк', url: sbp?.alfaLink },
      { label: 'Т-Банк', url: sbp?.tbankLink },
      { label: 'Сбер', url: sbp?.sberLink }
    ]
      .map((bank) => ({ label: bank.label, url: typeof bank.url === 'string' ? bank.url.trim() : '' }))
      .filter((bank): bank is PaymentLink => bank.url.length > 0)
    return { qrImageUrl, recipientHint, paymentLinks }
  } catch {
    return { qrImageUrl: null, recipientHint: null, paymentLinks: [] }
  }
}

export default async function CheckoutPage() {
  const [products, sbp] = await Promise.all([getCatalogProducts(), readSbpDisplay()])

  return (
    <div className="page">
      <section className="shopIntro">
        <h1 className="display">Оформление</h1>
        <p>Прототип оформления: контакты, пункт выдачи СДЭК и оплата по СБП.</p>
      </section>
      <CheckoutClient
        products={products}
        qrImageUrl={sbp.qrImageUrl}
        recipientHint={sbp.recipientHint}
        paymentLinks={sbp.paymentLinks}
      />
    </div>
  )
}
