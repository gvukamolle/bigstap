import type { ProductSaleStatus } from '@/domain/products'

const labels: Record<ProductSaleStatus, string> = {
  in_stock: 'В наличии',
  preorder: 'Предзаказ',
  sold_out: 'Нет в наличии',
  hidden: 'Скрыт'
}

export function StatusPill({ status }: { status: ProductSaleStatus }) {
  return <span className={`statusPill status-${status}`}>{labels[status]}</span>
}
