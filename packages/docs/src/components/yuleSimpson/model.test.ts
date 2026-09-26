import {
  aggregated,
  departments,
  femaleRate,
  femaleShare,
  pathEnd,
  pathSegments,
  planeExtent,
  rayEnd,
  riskDifference,
  standardized,
  type Department,
  type Group,
  type Point
} from '@site/src/components/yuleSimpson/model'
import { describe, expect, it } from 'vitest'

const GROUPS: readonly Group[] = ['male', 'female']
const WEIGHTS: readonly number[] = [0, 0.25, 0.5, standardized.sign_change_at, 0.9, 1]
/** Decimal places for comparisons of counts, which run into the thousands. */
const COUNT_DIGITS = 9
/** Decimal places for comparisons of rates and shares. */
const RATE_DIGITS = 12

function departmentNamed(name: string): Department {
  const department = departments.find(candidate => candidate.department === name)
  if (department === undefined) {
    throw new Error(`No department named ${name}`)
  }
  return department
}

function lastPoint(group: Group, mode: 'departments' | 'aggregated', t: number): Point {
  const last = pathSegments(group, mode, t).at(-1)
  if (last === undefined) {
    throw new Error('A path has no segments')
  }
  return last.to
}

describe('femaleShare', () => {
  it.each(WEIGHTS)('forms a distribution over departments at t = %s', t => {
    const total = departments.reduce((sum, department) => sum + femaleShare(department, t), 0)

    expect(total).toBeCloseTo(1, RATE_DIGITS)
  })

  it('moves from the shares of women to those of men', () => {
    for (const department of departments) {
      expect(femaleShare(department, 0)).toBe(department.share_female)
      expect(femaleShare(department, 1)).toBe(department.share_male)
    }
  })
})

describe('femaleRate', () => {
  it.each(WEIGHTS)('averages the department rates with the shares at t = %s', t => {
    const average = departments.reduce(
      (sum, department) => sum + femaleShare(department, t) * department.rate_female,
      0
    )

    expect(femaleRate(t)).toBeCloseTo(average, RATE_DIGITS)
  })

  it('interpolates the observed and the standardized rates computed in R', () => {
    expect(femaleRate(0)).toBe(aggregated.rate_female)
    expect(femaleRate(1)).toBe(standardized.rate_female)
  })
})

describe('riskDifference', () => {
  it('runs from the aggregated difference to the standardized one', () => {
    expect(riskDifference(0)).toBeCloseTo(aggregated.risk_difference, RATE_DIGITS)
    expect(riskDifference(1)).toBeCloseTo(standardized.risk_difference, RATE_DIGITS)
  })

  it('vanishes where R places the change of sign, and only there', () => {
    const at = standardized.sign_change_at

    expect(riskDifference(at)).toBeCloseTo(0, RATE_DIGITS)
    expect(riskDifference(at - 0.01)).toBeGreaterThan(0)
    expect(riskDifference(at + 0.01)).toBeLessThan(0)
  })
})

describe('pathSegments', () => {
  it('lays the vectors tip to tail from the origin', () => {
    for (const group of GROUPS) {
      let expectedFrom: Point = { x: 0, y: 0 }

      for (const segment of pathSegments(group, 'departments', 0.5)) {
        expect(segment.from).toEqual(expectedFrom)
        expectedFrom = segment.to
      }
    }
  })

  it('draws the observed rejected and admitted counts of each department at t = 0', () => {
    for (const segment of pathSegments('male', 'departments', 0)) {
      const department = departmentNamed(segment.department)

      expect(segment.to.x - segment.from.x).toBeCloseTo(
        department.applicants_male - department.admitted_male,
        COUNT_DIGITS
      )
      expect(segment.to.y - segment.from.y).toBeCloseTo(department.admitted_male, COUNT_DIGITS)
    }
    for (const segment of pathSegments('female', 'departments', 0)) {
      const department = departmentNamed(segment.department)

      expect(segment.to.x - segment.from.x).toBeCloseTo(
        department.applicants_female - department.admitted_female,
        COUNT_DIGITS
      )
      expect(segment.to.y - segment.from.y).toBeCloseTo(department.admitted_female, COUNT_DIGITS)
    }
  })

  it.each(WEIGHTS)('ends at the same point in both modes at t = %s', t => {
    for (const group of GROUPS) {
      const departmentsEnd = lastPoint(group, 'departments', t)
      const aggregatedEnd = lastPoint(group, 'aggregated', t)
      const end = pathEnd(group, t)

      expect(departmentsEnd.x).toBeCloseTo(end.x, COUNT_DIGITS)
      expect(departmentsEnd.y).toBeCloseTo(end.y, COUNT_DIGITS)
      expect(aggregatedEnd.x).toBeCloseTo(end.x, COUNT_DIGITS)
      expect(aggregatedEnd.y).toBeCloseTo(end.y, COUNT_DIGITS)
    }
  })

  it.each(WEIGHTS)('lies on the chord in the aggregated mode at t = %s', t => {
    for (const group of GROUPS) {
      const end = pathEnd(group, t)

      for (const segment of pathSegments(group, 'aggregated', t)) {
        // The cross product of a vertex with the end vanishes when the two are collinear.
        expect(segment.to.x * end.y - segment.to.y * end.x).toBeCloseTo(0, 6)
      }
    }
  })

  it('has the male chord the steeper as observed, and the female one when reweighted', () => {
    const slope = (point: Point): number => point.y / point.x

    expect(slope(pathEnd('male', 0))).toBeGreaterThan(slope(pathEnd('female', 0)))
    expect(slope(pathEnd('female', 1))).toBeGreaterThan(slope(pathEnd('male', 1)))
  })
})

describe('planeExtent', () => {
  it.each(WEIGHTS)('holds every vertex of both paths at t = %s', t => {
    const extent = planeExtent()

    for (const group of GROUPS) {
      for (const segment of pathSegments(group, 'departments', t)) {
        expect(segment.to.x).toBeLessThanOrEqual(extent.x + 1e-9)
        expect(segment.to.y).toBeLessThanOrEqual(extent.y + 1e-9)
      }
    }
  })
})

describe('rayEnd', () => {
  const corner: Point = { x: 1600, y: 1200 }

  it.each([0.05, 0.43, 0.5, 0.82])('points along the rate %s and stops at the edge', rate => {
    const end = rayEnd(rate, corner)

    expect(end.y / end.x).toBeCloseTo(rate / (1 - rate), RATE_DIGITS)
    expect(Math.max(end.x / corner.x, end.y / corner.y)).toBeCloseTo(1, RATE_DIGITS)
  })
})
