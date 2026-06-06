import type { Metadata } from 'next'

import { LegalDocumentView } from '@/components/LegalDocumentView'
import { offerDocument } from '@/data/legal'
import { getCanonicalUrl } from '@/lib/siteUrl'

export const metadata: Metadata = {
  title: 'Публичная оферта',
  description: 'Условия публичной оферты интернет-магазина Grushko Stepan.',
  alternates: { canonical: getCanonicalUrl('/offer') },
  openGraph: { url: getCanonicalUrl('/offer') }
}

export default function OfferPage() {
  return <LegalDocumentView document={offerDocument} />
}
