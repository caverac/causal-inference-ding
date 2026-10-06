import {
  nearestIndex,
  overlaps,
  placeOnCurve,
  type Box,
  type Screen
} from '@site/src/components/correlationMap/placement'
import { describe, expect, it } from 'vitest'

/** A horizontal curve, one candidate every 10 pixels from x = 0 to x = 200, at y = 50. */
const CURVE: readonly Screen[] = Array.from({ length: 21 }, (_unused, index) => [index * 10, 50])
const SIZE = { width: 20, height: 10 }
const BOUNDS: Screen = [200, 100]

describe('overlaps', () => {
  it('detects boxes that share area and not those that only touch', () => {
    const box: Box = { x: 10, y: 10, width: 10, height: 10 }

    expect(overlaps(box, { x: 15, y: 12, width: 10, height: 10 })).toBe(true)
    expect(overlaps(box, { x: 20, y: 10, width: 10, height: 10 })).toBe(false)
    expect(overlaps(box, { x: 10, y: 30, width: 10, height: 10 })).toBe(false)
  })
})

describe('placeOnCurve', () => {
  it('uses the preferred candidate when it is free', () => {
    expect(placeOnCurve(CURVE, 10, SIZE, [], BOUNDS)).toEqual({ x: 100, y: 50, ...SIZE })
  })

  it('moves along the curve to the nearest candidate that clears the obstacles', () => {
    const obstacle: Box = { x: 100, y: 50, width: 30, height: 10 }

    // Candidates 80 and 120 are 20 pixels away, which a 20-wide label at a
    // 30-wide obstacle needs at least 25 of; 70 is the first free one, before 130.
    expect(placeOnCurve(CURVE, 10, SIZE, [obstacle], BOUNDS)?.x).toBe(70)
  })

  it('keeps the label inside the bounds', () => {
    expect(placeOnCurve(CURVE, 0, SIZE, [], BOUNDS)?.x).toBe(10)
  })

  it('leaves the label out when nothing is free', () => {
    const wall: Box = { x: 100, y: 50, width: 400, height: 40 }

    expect(placeOnCurve(CURVE, 10, SIZE, [wall], BOUNDS)).toBeNull()
  })
})

describe('nearestIndex', () => {
  it('finds the candidate closest to a target', () => {
    expect(nearestIndex(CURVE, [123, 80])).toBe(12)
  })
})
