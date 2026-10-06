import { useEffect, useState, type RefObject } from 'react'

/**
 * Width in pixels of an element, kept up to date as the element is resized.
 *
 * Charts are drawn at this width rather than scaled to it, so their text keeps
 * one size on every screen. The width is 0 until the element is measured,
 * which only happens in the browser.
 */
export function useContainerWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const element = ref.current
    if (element === null) return

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setWidth(Math.round(entry.contentRect.width))
      }
    })
    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [ref])

  return width
}
