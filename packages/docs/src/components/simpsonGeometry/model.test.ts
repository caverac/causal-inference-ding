import {
  SUBGROUPS,
  controlVectors,
  example,
  planeExtent,
  riskDifference,
  treatedRate,
  treatedUnits,
  treatedVectors,
  type Example,
  type ExampleName,
  type Point
} from '@site/src/components/simpsonGeometry/model'
import { describe, expect, it } from 'vitest'

const NAMES: readonly ExampleName[] = ['postcard', 'ramp_up']
/** Decimal places for comparisons of counts, which run into the millions. */
const COUNT_DIGITS = 6
/** Decimal places for comparisons of rates and shares. */
const RATE_DIGITS = 12

function shares(data: Example): number[] {
  return [0, 0.25, data.sign_change_at, data.control.share, data.treated.share, 1]
}

function slopeRate(point: Point): number {
  return point.y / (point.x + point.y)
}

describe.each(NAMES)('the %s example', name => {
  const data = example(name)

  it('reverses the sign of the risk difference in the aggregate', () => {
    const within = Math.sign(data.risk_difference['1'])

    expect(Math.sign(data.risk_difference['0'])).toBe(within)
    expect(Math.sign(data.risk_difference.aggregated)).toBe(-within)
  })

  it('reproduces the observed treated vectors at the observed share', () => {
    const vectors = treatedVectors(data, data.treated.share)

    for (const subgroup of SUBGROUPS) {
      expect(vectors.subgroups[subgroup].x).toBeCloseTo(
        data.treated.subgroups[subgroup].failures,
        COUNT_DIGITS
      )
      expect(vectors.subgroups[subgroup].y).toBeCloseTo(
        data.treated.subgroups[subgroup].successes,
        COUNT_DIGITS
      )
    }
    expect(vectors.aggregated.x).toBeCloseTo(data.treated.aggregated.failures, COUNT_DIGITS)
    expect(vectors.aggregated.y).toBeCloseTo(data.treated.aggregated.successes, COUNT_DIGITS)
  })

  it('reproduces the aggregated difference computed in R at the observed share', () => {
    expect(riskDifference(data, data.treated.share)).toBeCloseTo(
      data.risk_difference.aggregated,
      RATE_DIGITS
    )
  })

  it.each(shares(data))('keeps every subgroup rate at share %s', share => {
    const vectors = treatedVectors(data, share)

    for (const subgroup of SUBGROUPS) {
      const vector = vectors.subgroups[subgroup]
      if (vector.x + vector.y > 0) {
        expect(slopeRate(vector)).toBeCloseTo(data.treated.subgroups[subgroup].rate, RATE_DIGITS)
      }
    }
  })

  it.each(shares(data))('keeps A the sum of A_1 and A_0 at share %s', share => {
    const vectors = treatedVectors(data, share)

    expect(vectors.aggregated.x).toBeCloseTo(
      vectors.subgroups['1'].x + vectors.subgroups['0'].x,
      COUNT_DIGITS
    )
    expect(vectors.aggregated.y).toBeCloseTo(
      vectors.subgroups['1'].y + vectors.subgroups['0'].y,
      COUNT_DIGITS
    )
  })

  it.each(shares(data))('moves the tip of A along the line of equal units at share %s', share => {
    const tip = treatedVectors(data, share).aggregated

    expect(tip.x + tip.y).toBeCloseTo(treatedUnits(data), COUNT_DIGITS)
    expect(slopeRate(tip)).toBeCloseTo(treatedRate(data, share), RATE_DIGITS)
  })

  it('makes the aggregated difference vanish at the sign change computed in R', () => {
    expect(riskDifference(data, data.sign_change_at)).toBeCloseTo(0, RATE_DIGITS)
  })

  it('averages the subgroup differences when both arms share the same mix', () => {
    const share = data.control.share
    const average = share * data.risk_difference['1'] + (1 - share) * data.risk_difference['0']

    expect(riskDifference(data, share)).toBeCloseTo(average, RATE_DIGITS)
  })

  it('returns the observed control vectors', () => {
    const vectors = controlVectors(data)

    for (const subgroup of SUBGROUPS) {
      expect(vectors.subgroups[subgroup]).toEqual({
        x: data.control.subgroups[subgroup].failures,
        y: data.control.subgroups[subgroup].successes
      })
    }
    expect(vectors.aggregated).toEqual({
      x: data.control.aggregated.failures,
      y: data.control.aggregated.successes
    })
  })

  it.each(shares(data))('holds every vector in the plane at share %s', share => {
    const extent = planeExtent(data)

    for (const arm of [treatedVectors(data, share), controlVectors(data)]) {
      for (const point of [arm.subgroups['1'], arm.subgroups['0'], arm.aggregated]) {
        expect(point.x).toBeLessThanOrEqual(extent.x + 1e-6)
        expect(point.y).toBeLessThanOrEqual(extent.y + 1e-6)
      }
    }
  })
})
