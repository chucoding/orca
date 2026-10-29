import { useEffect } from 'react'
import { cssPxToWindowDip } from '@/lib/ui-zoom'
import { browserPageZoomLevelToFactor } from '../../../../../shared/browser-page-zoom'

export type BrowserPageViewportSize = { width: number; height: number }

/** Guest `innerWidth`/`innerHeight` for a host box measured in window DIP. */
export function toBrowserPageGuestViewportSize(
  hostBoxWindowDip: BrowserPageViewportSize,
  pageZoomLevel: number
): BrowserPageViewportSize {
  const zoomFactor = browserPageZoomLevelToFactor(pageZoomLevel)
  // Why: mirrors Blink's AdjustForAbsoluteZoom::AdjustInt on the guest's integer DIP size, which
  // adds 1 before truncating when zoomed in; the epsilon absorbs float error like 1199.9999.
  const toGuestPx = (dip: number): number => {
    const wholeDip = Math.round(dip)
    if (zoomFactor === 1) {
      return wholeDip
    }
    return Math.floor((zoomFactor > 1 ? wholeDip + 1 : wholeDip) / zoomFactor + 1e-6)
  }
  return { width: toGuestPx(hostBoxWindowDip.width), height: toGuestPx(hostBoxWindowDip.height) }
}

/** The guest's live zoom level, or null until it can be read. */
function readGuestZoomLevel(webview: Electron.WebviewTag | null): number | null {
  try {
    // Why the live level: an embedder (UI) zoom change overwrites the guest's zoom behind Orca's back.
    return webview?.getZoomLevel() ?? null
  } catch {
    // getZoomLevel throws until dom-ready, which is also when a saved site zoom lands.
    return null
  }
}

/** Reports the guest viewport size whenever the observed page box is resized. */
export function useBrowserPageViewportSizeFeedback(
  content: HTMLDivElement | null,
  enabled: boolean,
  webviewRef: React.RefObject<Electron.WebviewTag | null>,
  {
    showBrowserViewportSizeFeedback,
    hideBrowserFeedback
  }: {
    showBrowserViewportSizeFeedback: (size: BrowserPageViewportSize) => void
    hideBrowserFeedback: () => void
  }
): void {
  useEffect(() => {
    if (!content || !enabled || typeof ResizeObserver === 'undefined') {
      return
    }
    // Why reset per enable: ResizeObserver's first callback is the current size, not a resize.
    // Why host DIP: the baseline must survive measurements taken before the guest zoom is readable.
    let previousHostDip: BrowserPageViewportSize | null = null
    const observer = new ResizeObserver((entries) => {
      const box = entries.at(-1)?.contentRect
      if (!box) {
        return
      }
      // Why: a parked page (workspace switch) measures 0×0 while still active; a running flash
      // would come back with a stale size, and the next size is only a baseline.
      if (box.width === 0 || box.height === 0) {
        previousHostDip = null
        hideBrowserFeedback()
        return
      }
      const hostDip = { width: cssPxToWindowDip(box.width), height: cssPxToWindowDip(box.height) }
      const previous = previousHostDip
      previousHostDip = hostDip
      // Why skip the flash but keep the baseline: a size computed at a guessed zoom is worse than
      // no size, yet the first resize after dom-ready must still be announced.
      const guestZoomLevel = readGuestZoomLevel(webviewRef.current)
      if (!previous || guestZoomLevel === null) {
        return
      }
      const before = toBrowserPageGuestViewportSize(previous, guestZoomLevel)
      const next = toBrowserPageGuestViewportSize(hostDip, guestZoomLevel)
      if (before.width !== next.width || before.height !== next.height) {
        showBrowserViewportSizeFeedback(next)
      }
    })
    observer.observe(content)
    return () => {
      observer.disconnect()
      // Why: a disabled page is no longer measured, so a running flash would go stale.
      hideBrowserFeedback()
    }
  }, [content, enabled, webviewRef, showBrowserViewportSizeFeedback, hideBrowserFeedback])
}
