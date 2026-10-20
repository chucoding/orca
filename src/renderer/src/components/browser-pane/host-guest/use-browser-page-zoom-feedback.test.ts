// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BROWSER_PAGE_ZOOM_FEEDBACK_MS } from '../describe-page/browser-annotation-geometry'
import { useBrowserPageZoomFeedback } from './use-browser-page-zoom-feedback'

const storeState = { browserDefaultZoomLevel: 0, setBrowserDefaultZoomLevel: vi.fn() }
vi.mock('@/store', () => ({
  useAppStore: (selector: (state: typeof storeState) => unknown) => selector(storeState)
}))

describe('useBrowserPageZoomFeedback', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('shows the latest of zoom and size feedback in one badge', () => {
    const { result } = renderHook(() => useBrowserPageZoomFeedback('page-1'))
    act(() => result.current.showBrowserZoomFeedback(1))
    expect(result.current.browserFeedbackLabel).toBe('120%')
    act(() => result.current.showBrowserViewportSizeFeedback({ width: 1024, height: 768 }))
    expect(result.current.browserFeedbackLabel).toBe('1024 × 768')
    expect(result.current.browserZoomPercent).toBe(120)
    expect(result.current.browserZoomFeedbackVisible).toBe(true)
  })

  it('restarts the fade timer on each flash', () => {
    const { result } = renderHook(() => useBrowserPageZoomFeedback('page-1'))
    act(() => result.current.showBrowserZoomFeedback(1))
    act(() => vi.advanceTimersByTime(BROWSER_PAGE_ZOOM_FEEDBACK_MS - 100))
    act(() => result.current.showBrowserViewportSizeFeedback({ width: 800, height: 600 }))
    act(() => vi.advanceTimersByTime(BROWSER_PAGE_ZOOM_FEEDBACK_MS - 100))
    expect(result.current.browserZoomFeedbackVisible).toBe(true)
    act(() => vi.advanceTimersByTime(100))
    expect(result.current.browserZoomFeedbackVisible).toBe(false)
    expect(result.current.browserFeedbackLabel).toBe('800 × 600')
  })
})
