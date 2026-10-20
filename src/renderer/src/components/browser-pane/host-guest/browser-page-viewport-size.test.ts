import { describe, expect, it } from 'vitest'
import {
  formatBrowserPageViewportSize,
  shouldShowBrowserPageViewportSizeFeedback,
  toBrowserPageGuestViewportSize
} from './browser-page-viewport-size'

describe('toBrowserPageGuestViewportSize', () => {
  it('matches the host box at default page zoom', () => {
    expect(toBrowserPageGuestViewportSize({ width: 1024, height: 768 }, 0)).toEqual({
      width: 1024,
      height: 768
    })
  })

  it('divides by the exact page zoom factor, not the rounded percent', () => {
    // Level -1 is 83.33%, so 1000 DIP holds a 1200 CSS px wide page.
    expect(toBrowserPageGuestViewportSize({ width: 1000, height: 500 }, -1)).toEqual({
      width: 1200,
      height: 600
    })
    expect(toBrowserPageGuestViewportSize({ width: 1200, height: 600 }, 1)).toEqual({
      width: 1000,
      height: 500
    })
  })
})

describe('shouldShowBrowserPageViewportSizeFeedback', () => {
  it('stays hidden for the first measurement', () => {
    expect(shouldShowBrowserPageViewportSizeFeedback(null, { width: 800, height: 600 })).toBe(false)
  })

  it('shows when a visible size changes', () => {
    expect(
      shouldShowBrowserPageViewportSizeFeedback(
        { width: 800, height: 600 },
        { width: 760, height: 600 }
      )
    ).toBe(true)
  })

  it('stays hidden when the rounded size is unchanged', () => {
    expect(
      shouldShowBrowserPageViewportSizeFeedback(
        { width: 800, height: 600 },
        { width: 800, height: 600 }
      )
    ).toBe(false)
  })

  it('stays hidden when the pane is hidden or shown again', () => {
    expect(
      shouldShowBrowserPageViewportSizeFeedback(
        { width: 800, height: 600 },
        { width: 0, height: 0 }
      )
    ).toBe(false)
    expect(
      shouldShowBrowserPageViewportSizeFeedback(
        { width: 0, height: 0 },
        { width: 1000, height: 600 }
      )
    ).toBe(false)
  })
})

it('formats the size like Chrome DevTools', () => {
  expect(formatBrowserPageViewportSize({ width: 1024, height: 768 })).toBe('1024 × 768')
})
