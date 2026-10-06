import {
  placeLabels,
  type LabelLayout,
  type LabelRequest
} from '@site/src/components/simpsonGeometry/labels'
import { describe, expect, it } from 'vitest'

const LAYOUT: LabelLayout = {
  offset: 10,
  width: 20,
  height: 10,
  step: 4,
  maxSteps: 20,
  minLength: 5,
  bounds: [1000, 1000]
}
const DIGITS = 9

/** A vector from (100, 500) that runs right by `run` pixels and up by `rise`. */
function vector(run: number, rise: number, side: LabelRequest['side'] = 0): LabelRequest {
  return { from: [100, 500], to: [100 + run, 500 - rise], side }
}

function only(requests: readonly LabelRequest[], layout: LabelLayout = LAYOUT): [number, number][] {
  return placeLabels(requests, layout).map(({ position }) => {
    if (position === null) {
      throw new Error('A label was not placed')
    }
    return [position[0], position[1]]
  })
}

describe('placeLabels', () => {
  it('keeps each request with its placement, in order', () => {
    const requests = [vector(200, 0), vector(0, 0), vector(0, 200)]

    expect(placeLabels(requests, LAYOUT).map(({ request }) => request)).toEqual(requests)
  })

  it('places a label straight ahead of the tip', () => {
    const [position] = only([vector(300, 400)])

    expect(position?.[0]).toBeCloseTo(400 + 6, DIGITS)
    expect(position?.[1]).toBeCloseTo(100 - 8, DIGITS)
  })

  it('leans a label halfway between ahead and its side', () => {
    // A vector running right: its left is up on the screen and its right down.
    const [left, right] = only([vector(200, 0, -1), vector(200, 0, 1)], {
      ...LAYOUT,
      maxSteps: 0
    })
    const diagonal = 10 / Math.SQRT2

    expect(left?.[0]).toBeCloseTo(300 + diagonal, DIGITS)
    expect(left?.[1]).toBeCloseTo(500 - diagonal, DIGITS)
    expect(right?.[0]).toBeCloseTo(300 + diagonal, DIGITS)
    expect(right?.[1]).toBeCloseTo(500 + diagonal, DIGITS)
  })

  it('gives no label to a vector shorter than the minimum', () => {
    expect(placeLabels([vector(3, 0), vector(200, 0)], LAYOUT)[0]?.position).toBeNull()
  })

  it('does not let a missing label push the others', () => {
    const [, placement] = placeLabels([vector(0, 0), vector(200, 0)], LAYOUT)

    expect(placement?.position).toEqual([310, 500])
  })

  it('moves a colliding label to its side until it clears the earlier one', () => {
    // Both vectors run right and end 2 pixels apart: the second label moves
    // down, the right of its direction, in steps of 4 until the boxes clear.
    const [first, second] = only([vector(200, 0), vector(202, 0)])

    expect(first).toEqual([310, 500])
    expect(second?.[0]).toBeCloseTo(312, DIGITS)
    expect(second?.[1]).toBeCloseTo(512, DIGITS)
  })

  it('moves a label leaning left further to the left', () => {
    const [, second] = only([vector(200, 0), vector(200, 0, -1)])
    const diagonal = 10 / Math.SQRT2

    expect(second?.[1]).toBeLessThanOrEqual(500 - 10)
    expect(second?.[0]).toBeCloseTo(300 + diagonal, DIGITS)
  })

  it('leaves a colliding label in place when it has no moves left', () => {
    const [, second] = only([vector(200, 0), vector(202, 0)], { ...LAYOUT, maxSteps: 0 })

    expect(second).toEqual([312, 500])
  })

  it('keeps every label inside the bounds', () => {
    const [position] = only([{ from: [0, 50], to: [95, 50], side: 0 }], {
      ...LAYOUT,
      bounds: [100, 100]
    })

    expect(position).toEqual([90, 50])
  })
})
