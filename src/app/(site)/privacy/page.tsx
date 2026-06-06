import type { Metadata } from 'next'

import { LegalDocumentView } from '@/components/LegalDocumentView'
import { privacyDocument } from '@/data/legal'
import { getCanonicalUrl } from '@/lib/siteUrl'

export const metadata: Metadata = {
  title: 'Политика конфиденциальности',
  description:
    'Политика конфиденциальности и обработки персональных данных интернет-магазина Grushko Stepan.',
  alternates: { canonical: getCanonicalUrl('/privacy') },
  openGraph: { url: getCanonicalUrl('/privacy') }
}

export default function PrivacyPage() {
  return <LegalDocumentView document={privacyDocument} />
}
