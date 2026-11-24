'use client'

import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useShell } from '@/components/site/shell-context'
import {
  INTERCOM_TOURS,
  type IntercomTourIntent,
} from '@/lib/lumen/intercom-intents'
type TargetRect = { top: number; left: number; width: number; height: number }

const PAD = 8

function readTargetRect(selector: string): TargetRect | null {
  const el = document.querySelector(selector)
  if (!(el instanceof HTMLElement)) return null
  const r = el.getBoundingClientRect()
  if (r.width < 2 || r.height < 2) return null
  return {
    top: r.top - PAD,
    left: r.left - PAD,
    width: r.width + PAD * 2,
    height: r.height + PAD * 2,
  }
}

/**
 * Lightweight coachmark tour — dim backdrop + cutout around a shell control.
 * Driven by `productTourId` on shell context (Fin-style Intercom intents).
 */
export function ProductTour() {
  const { productTourId, endProductTour, setVipHubOpen } = useShell()
  const [mounted, setMounted] = useState(false)
  const [rect, setRect] = useState<TargetRect | null>(null)

  const tour =
    productTourId && productTourId in INTERCOM_TOURS
      ? INTERCOM_TOURS[productTourId as IntercomTourIntent]
      : null

  useEffect(() => {
    setMounted(true)
  }, [])

  const syncRect = useCallback(() => {
    if (!tour) {
      setRect(null)
      return
    }
    setRect(readTargetRect(tour.selector))
  }, [tour])

  useLayoutEffect(() => {
    syncRect()
  }, [syncRect])

  useEffect(() => {
    if (!tour) return
    const onResize = () => syncRect()
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onResize, true)
    const id = window.setInterval(syncRect, 400)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onResize, true)
      window.clearInterval(id)
    }
  }, [tour, syncRect])

  const openVip = () => {
    if (!tour) return
    endProductTour()
    setVipHubOpen(true, tour.vipHubTab)
  }

  const dismiss = () => {
    endProductTour()
  }

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {tour ? (
        <motion.div
          key={tour.id}
          data-product-tour=""
          className="pointer-events-none fixed inset-0 z-[200]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Dim layers with a hole around the target */}
          {rect ? (
            <>
              <div
                className="pointer-events-auto absolute inset-x-0 top-0 bg-black/65"
                style={{ height: Math.max(0, rect.top) }}
                onClick={dismiss}
              />
              <div
                className="pointer-events-auto absolute inset-x-0 bg-black/65"
                style={{
                  top: rect.top + rect.height,
                  bottom: 0,
                }}
                onClick={dismiss}
              />
              <div
                className="pointer-events-auto absolute bg-black/65"
                style={{
                  top: rect.top,
                  left: 0,
                  width: Math.max(0, rect.left),
                  height: rect.height,
                }}
                onClick={dismiss}
              />
              <div
                className="pointer-events-auto absolute bg-black/65"
                style={{
                  top: rect.top,
                  left: rect.left + rect.width,
                  right: 0,
                  height: rect.height,
                }}
                onClick={dismiss}
              />
              <div
                className="pointer-events-none absolute rounded-xl ring-2 ring-primary ring-offset-2 ring-offset-transparent"
                style={{
                  top: rect.top,
                  left: rect.left,
                  width: rect.width,
                  height: rect.height,
                }}
                aria-hidden
              />
              {/* Allow clicking the VIP button through the hole */}
              <button
                type="button"
                aria-label="Open highlighted control"
                className="pointer-events-auto absolute cursor-pointer rounded-xl bg-transparent"
                style={{
                  top: rect.top,
                  left: rect.left,
                  width: rect.width,
                  height: rect.height,
                }}
                onClick={openVip}
              />
            </>
          ) : (
            <div
              className="pointer-events-auto absolute inset-0 bg-black/65"
              onClick={dismiss}
            />
          )}

          <motion.div
            role="dialog"
            aria-label={tour.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className="pointer-events-auto absolute z-10 w-[min(320px,calc(100vw-2rem))] rounded-2xl bg-white p-4 text-left text-zinc-900 shadow-[0_16px_48px_rgba(0,0,0,0.55)]"
            style={
              rect
                ? {
                    top: Math.min(
                      rect.top + rect.height + 14,
                      window.innerHeight - 200,
                    ),
                    left: Math.min(
                      Math.max(16, rect.left + rect.width / 2 - 160),
                      window.innerWidth - 336,
                    ),
                  }
                : {
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                  }
            }
          >
            <p className="text-[15px] font-bold tracking-tight">{tour.title}</p>
            <p className="mt-1.5 text-[13px] leading-[1.5] text-zinc-600">
              {tour.body}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={dismiss}
                className="inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-zinc-200 text-[13px] font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                Got it
              </button>
              <button
                type="button"
                onClick={openVip}
                className="inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-primary text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                {tour.ctaLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
