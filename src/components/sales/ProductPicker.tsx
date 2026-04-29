'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Camera } from 'lucide-react'
import { useBusiness } from '@/contexts/business-context'
import { useProducts } from '@/contexts/products-context'
import { useBarcodeScan } from '@/hooks/useBarcodeScan'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { Modal } from '@/components/ui/modal'
import type { Product } from '@/types'
import type { UseCartResult } from '@/hooks/useCart'

interface ProductPickerProps {
  cart: UseCartResult
}

export function ProductPicker({ cart }: ProductPickerProps) {
  const t = useTranslations('sales')
  const tToast = useTranslations('sales.toast')
  const { business } = useBusiness()
  const { products, ensureLoaded } = useProducts()
  const { formatCurrency } = useBusinessFormat()
  const [search, setSearch] = useState('')
  const [oosCandidate, setOosCandidate] = useState<Product | null>(null)
  const [confirmedOosIds] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    void ensureLoaded()
    // ensureLoaded is stable; intentionally not in deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products
      .filter((p) => p.active !== false)
      .filter((p) => (q ? p.name.toLowerCase().includes(q) : true))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [products, search])

  const tryAddProduct = (product: Product) => {
    const stock = product.stock ?? 0
    const alreadyConfirmed = confirmedOosIds.has(product.id)
    const alreadyInCart = cart.lines.some((l) => l.productId === product.id)
    if (stock <= 0 && !alreadyConfirmed && !alreadyInCart) {
      setOosCandidate(product)
      return
    }
    cart.addLine(product)
  }

  const { open: openScanner, hiddenInput } = useBarcodeScan({
    onResult: async (result) => {
      if (!business?.id) return
      try {
        const url = `/api/businesses/${business.id}/products?barcode=${encodeURIComponent(result.value)}`
        const res = await fetch(url)
        const data = await res.json()
        if (res.ok && data.success && data.product) {
          tryAddProduct(data.product as Product)
        } else {
          alert(tToast('no_barcode_match'))
        }
      } catch {
        alert(tToast('no_barcode_match'))
      }
    },
    onError: () => {
      alert(tToast('no_barcode_match'))
    },
  })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <input
          type="search"
          inputMode="search"
          placeholder={t('search_placeholder')}
          className="flex-1 rounded-full border border-border bg-bg-elevated px-4 py-2 text-base"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          type="button"
          onClick={openScanner}
          className="rounded-full border border-border bg-bg-elevated p-2 hover:border-brand-300"
          aria-label="Scan barcode"
        >
          <Camera className="w-5 h-5" />
        </button>
        {hiddenInput}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {visibleProducts.map((product) => {
          const stock = product.stock ?? 0
          return (
            <button
              key={product.id}
              type="button"
              onClick={() => tryAddProduct(product)}
              className="rounded-xl border border-border bg-bg-elevated p-3 text-left hover:border-brand-300 active:scale-[0.97] transition-all"
            >
              <div className="text-sm font-medium truncate">{product.name}</div>
              <div className="text-xs text-text-secondary mt-1">{formatCurrency(product.price)}</div>
              {stock <= 0 && (
                <div className="text-[10px] uppercase tracking-wide text-warning mt-1">
                  {tToast('out_of_stock_confirm_title')}
                </div>
              )}
            </button>
          )
        })}
      </div>

      <Modal
        isOpen={oosCandidate !== null}
        title={tToast('out_of_stock_confirm_title')}
        onClose={() => setOosCandidate(null)}
      >
        {oosCandidate && (
          <Modal.Step title={tToast('out_of_stock_confirm_title')}>
            <div className="px-4 py-3 text-sm">
              {tToast('out_of_stock_confirm_body', { name: oosCandidate.name })}
            </div>
            <Modal.Footer>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setOosCandidate(null)}
              >
                {tToast('out_of_stock_confirm_cancel')}
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  if (oosCandidate) {
                    confirmedOosIds.add(oosCandidate.id)
                    cart.addLine(oosCandidate)
                    setOosCandidate(null)
                  }
                }}
              >
                {tToast('out_of_stock_confirm_action')}
              </button>
            </Modal.Footer>
          </Modal.Step>
        )}
      </Modal>
    </div>
  )
}
