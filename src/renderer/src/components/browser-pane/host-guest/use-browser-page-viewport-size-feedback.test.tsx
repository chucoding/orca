// @vitest-environment happy-dom
import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useBrowserPageViewportSizeFeedback } from './use-browser-page-viewport-size-feedback'

let uiZoomFactor = 1
vi.mock('@/lib/ui-zoom', () => ({ cssPxToWindowDip: (px: number) => px * uiZoomFactor }))

let observerCallbacks: ResizeObserverCallback[] = []

class FakeResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    observerCallbacks.push(callback)
  }
  observe(): void {}
  disconnect(): void {}
  unobserve(): void {}
}

function resizeTo(width: number, height: number): void {
  const entry = { contentRect: { width, height } }
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the hook only reads contentRect width and height.
  observerCallbacks.at(-1)?.([entry] as unknown as ResizeObserverEntry[], {} as ResizeObserver)
}

describe('useBrowserPageViewportSizeFeedback', () => {
  const showBrowserViewportSizeFeedback = vi.fn()
  beforeEach(() => {
    observerCallbacks = []
    uiZoomFactor = 1
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
  })

  afterEach(() => {
    cleanup()
    showBrowserViewportSizeFeedback.mockReset()
    vi.unstubAllGlobals()
  })

  function renderFeedback(isActive: boolean, getGuestZoomLevel?: () => number) {
    const content = document.createElement('div')
    const webviewRef = {
      current: getGuestZoomLevel
        ? // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the hook only calls getZoomLevel on the guest.
          ({ getZoomLevel: getGuestZoomLevel } as unknown as Electron.WebviewTag)
        : null
    }
    return renderHook(
      ({ active }) =>
        useBrowserPageViewportSizeFeedback(
          content,
          active,
          webviewRef,
          showBrowserViewportSizeFeedback
        ),
      { initialProps: { active: isActive } }
    )
  }

  it('reports a resize but not the initial measurement', () => {
    renderFeedback(true)
    resizeTo(800, 600)
    expect(showBrowserViewportSizeFeedback).not.toHaveBeenCalled()
    resizeTo(760, 600)
    expect(showBrowserViewportSizeFeedback).toHaveBeenCalledWith({ width: 760, height: 600 })
  })

  it('converts the host box through UI zoom and the live guest zoom', () => {
    // A 1.2 UI zoom grows host CSS px; guest zoom level 1 grows guest CSS px by the same 1.2.
    uiZoomFactor = 1.2
    renderFeedback(true, () => 1)
    resizeTo(500, 400)
    resizeTo(600, 400)
    expect(showBrowserViewportSizeFeedback).toHaveBeenCalledWith({ width: 600, height: 400 })
  })

  it('assumes default zoom before the guest is ready', () => {
    renderFeedback(true, () => {
      throw new Error('not attached')
    })
    resizeTo(600, 480)
    resizeTo(720, 480)
    expect(showBrowserViewportSizeFeedback).toHaveBeenCalledWith({ width: 720, height: 480 })
  })

  it('does not observe an inactive pane', () => {
    renderFeedback(false)
    expect(observerCallbacks).toHaveLength(0)
  })
})
