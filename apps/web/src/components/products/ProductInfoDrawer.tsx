'use client'

import { useIntl } from 'react-intl';
import Image from '@/lib/Image'
import { ImagePlus } from 'lucide-react'
import { ModalShell } from '@/components/ui/modal-shell'
import { BarcodeDisplay } from './BarcodeDisplay'
import { isPresetIcon, getPresetIcon } from '@/lib/preset-icons'
import { getProductIconUrl } from '@/lib/utils'
import type { Product, ProductCategory, BarcodeFormat } from '@kasero/shared/types'

const BARCODE_FORMAT_LABELS: Record<BarcodeFormat, string> = {
  CODABAR: 'Codabar',
  CODE_39: 'Code 39',
  CODE_93: 'Code 93',
  CODE_128: 'Code 128',
  ITF: 'ITF',
  EAN_13: 'EAN-13',
  EAN_8: 'EAN-8',
  UPC_A: 'UPC-A',
  UPC_E: 'UPC-E',
  UPC_EAN_EXTENSION: 'UPC/EAN Extension',
}

export interface ProductInfoDrawerProps {
  isOpen: boolean
  onClose: () => void
  onExitComplete?: () => void
  product: Product | null
  categories: ProductCategory[]
}

export function ProductInfoDrawer({
  isOpen,
  onClose,
  onExitComplete: _onExitComplete,
  product,
  categories,
}: ProductInfoDrawerProps) {
  const t = useIntl()

  // Render nothing if no product is set. The parent's open-state is
  // typically gated on `!!product`, so this branch only fires during the
  // brief window between close and onExitComplete-cleanup.
  if (!product) return null

  const iconUrl = getProductIconUrl(product)
  const categoryName =
    categories.find(c => c.id === product.categoryId)?.name ?? t.formatMessage({
      id: 'products.uncategorized'
    })
  const formatLabel =
    product.barcodeFormat ? BARCODE_FORMAT_LABELS[product.barcodeFormat] : null

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={t.formatMessage({
        id: 'products.info_drawer_title'
      })}
    >
      <div className="flex flex-col items-center py-6">
        <div className="w-56 h-56 rounded-3xl overflow-hidden flex items-center justify-center bg-bg-muted">
          {iconUrl && isPresetIcon(iconUrl) ? (
            (() => {
              const p = getPresetIcon(iconUrl)
              return p ? <p.icon size={120} className="text-text-primary" /> : null
            })()
          ) : iconUrl ? (
            <Image
              src={iconUrl}
              alt={product.name}
              width={224}
              height={224}
              className="object-cover w-full h-full"
              unoptimized
            />
          ) : (
            <ImagePlus className="w-20 h-20 text-text-tertiary" />
          )}
        </div>
        <div className="font-medium text-lg mt-4 text-center">{product.name}</div>
        <div className="text-sm text-text-tertiary mt-1 text-center">{categoryName}</div>
      </div>
      <div className="modal-step-item">
        {product.barcode && product.barcodeFormat ? (
          <div className="flex flex-col items-center gap-3">
            <BarcodeDisplay value={product.barcode} format={product.barcodeFormat} />
            <div className="text-center">
              <div className="text-sm font-medium text-text-primary">{formatLabel}</div>
              <div className="text-sm font-mono text-text-secondary mt-0.5 break-all">
                {product.barcode}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center text-sm text-text-tertiary">
            {t.formatMessage({
              id: 'products.info_drawer_no_barcode'
            })}
          </p>
        )}
      </div>
    </ModalShell>
  );
}
