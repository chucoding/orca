import { useEffect } from 'react'
import { cssPxToWindowDip } from '@/lib/ui-zoom'
import { DEFAULT_BROWSER_PAGE_ZOOM_LEVEL } from '../../../../../shared/browser-page-zoom'
import {
  shouldShowBrowserPageViewportSizeFeedback,
  toBrowserPageGuestViewportSize,
  type BrowserPageViewportSize
} from './browser-page-viewport-size'

function readGuestZoomLevel(webview: Electron.WebviewTag | null): number {
  try {
    // Why the live level: an embedder (UI) zoom change overwrites the guest's zoom behind Orca's back.
    return webview ? webview.getZoomLevel() : DEFAULT_BROWSER_PAGE_ZOOM_LEVEL
  } catch {
    // getZoomLevel throws until the guest is attached and dom-ready.
    return DEFAULT_BROWSER_PAGE_ZOOM_LEVEL
  }
}

/** Reports the guest viewport size whenever the active pane's page box is resized. */
export function useBrowserPageViewportSizeFeedback(
  content: HTMLDivElement | null,
  isActive: boolean,
  webviewRef: React.RefObject<Electron.WebviewTag | null>,
  showBrowserViewportSizeFeedback: (size: BrowserPageViewportSize) => void
): void {
  useEffect(() => {
    if (!content || !isActive || typeof ResizeObserver === 'undefined') {
      return
    }
    // Why reset per activation: ResizeObserver's first callback is the current size, not a resize.
    let previous: BrowserPageViewportSize | null = null
    const observer = new ResizeObserver((entries) => {
      const box = entries.at(-1)?.contentRect
      if (!box) {
        return
      }
      const next = toBrowserPageGuestViewportSize(
        { width: cssPxToWindowDip(box.width), height: cssPxToWindowDip(box.height) },
        readGuestZoomLevel(webviewRef.current)
      )
      const show = shouldShowBrowserPageViewportSizeFeedback(previous, next)
      previous = next
      if (show) {
        showBrowserViewportSizeFeedback(next)
      }
    })
    observer.observe(content)
    return () => observer.disconnect()
  }, [content, isActive, webviewRef, showBrowserViewportSizeFeedback])
}
