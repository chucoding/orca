import { browserPageZoomLevelToFactor } from '../../../../../shared/browser-page-zoom'

export type BrowserPageViewportSize = { width: number; height: number }

/** Guest `innerWidth`/`innerHeight` for a host box measured in window DIP. */
export function toBrowserPageGuestViewportSize(
  hostBoxWindowDip: BrowserPageViewportSize,
  pageZoomLevel: number
): BrowserPageViewportSize {
  const zoomFactor = browserPageZoomLevelToFactor(pageZoomLevel)
  return {
    width: Math.round(hostBoxWindowDip.width / zoomFactor),
    height: Math.round(hostBoxWindowDip.height / zoomFactor)
  }
}

/** Whether a measured size change is a real resize worth announcing. */
export function shouldShowBrowserPageViewportSizeFeedback(
  previous: BrowserPageViewportSize | null,
  next: BrowserPageViewportSize
): boolean {
  // Why: a hidden pane measures 0×0, so showing it again (tab or workspace switch) is not a resize.
  if (!previous || previous.width === 0 || previous.height === 0) {
    return false
  }
  if (next.width === 0 || next.height === 0) {
    return false
  }
  return previous.width !== next.width || previous.height !== next.height
}

export function formatBrowserPageViewportSize(size: BrowserPageViewportSize): string {
  return `${size.width} × ${size.height}`
}
