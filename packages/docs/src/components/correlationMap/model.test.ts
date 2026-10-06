import {
  CONTOUR_LEVELS,
  LABEL_SIDE,
  PLANE,
  baseline,
  contour,
  contourLabelPoints,
  correlation,
  covariates,
  groups,
  planePoint,
  shiftAt,
  shiftScale,
  variableIndex,
  variables
} from '@site/src/components/correlationMap/model'
import { describe, expect, it } from 'vitest'

/** Relative agreement with the regressions fitted in R. */
const SHIFT_DIGITS = 6

describe('the correlations', () => {
  it('form a symmetric matrix with a unit diagonal', () => {
    for (let row = 0; row < variables.length; row++) {
      expect(correlation(row, row)).toBeCloseTo(1, 12)
      for (let column = 0; column < variables.length; column++) {
        expect(correlation(row, column)).toBe(correlation(column, row))
      }
    }
  })

  it('agree with the correlations of each covariate', () => {
    const outcome = variableIndex('re78')
    const treatment = variableIndex('treat')

    for (const covariate of covariates) {
      const index = variableIndex(covariate.name)
      expect(correlation(index, treatment)).toBe(covariate.rho_zx)
      expect(correlation(index, outcome)).toBe(covariate.rho_yx)
    }
  })

  it('reject an index outside the matrix', () => {
    expect(() => correlation(0, variables.length)).toThrow(RangeError)
  })

  it('group the variables as the R package does', () => {
    expect(variables.slice(0, 2)).toEqual(['re78', 'treat'])
    expect(groups).toHaveLength(variables.length)
    expect(variableIndex('nothing')).toBe(-1)
  })
})

describe('shiftAt', () => {
  it.each(covariates.map(covariate => [covariate.name, covariate] as const))(
    'reproduces the regression of re78 on treat and %s',
    (_name, covariate) => {
      expect(shiftAt(planePoint(covariate)) / covariate.shift).toBeCloseTo(1, SHIFT_DIGITS)
      expect(baseline + covariate.shift).toBeCloseTo(covariate.estimate, 6)
    }
  )

  it('vanishes on the axes', () => {
    expect(shiftAt({ x: 0, y: 0.5 })).toBeCloseTo(0, 12)
    expect(shiftAt({ x: 0.2, y: 0 })).toBeCloseTo(0, 12)
  })

  it('is positive exactly when the two correlations have opposite signs', () => {
    expect(shiftAt({ x: -0.1, y: 0.5 })).toBeGreaterThan(0)
    expect(shiftAt({ x: 0.1, y: -0.5 })).toBeGreaterThan(0)
    expect(shiftAt({ x: 0.1, y: 0.5 })).toBeLessThan(0)
  })
})

describe('the plane', () => {
  it('holds every covariate', () => {
    for (const covariate of covariates) {
      expect(Math.abs(covariate.rho_zx)).toBeLessThan(PLANE.x)
      expect(Math.abs(covariate.rho_yx_z)).toBeLessThan(PLANE.y)
    }
  })

  it('names a label side for every covariate', () => {
    expect(Object.keys(LABEL_SIDE).sort()).toEqual(
      covariates.map(covariate => covariate.name).sort()
    )
  })
})

describe('contour', () => {
  it.each(CONTOUR_LEVELS)('stays on the level %s and inside the plane', level => {
    const branches = contour(level)

    expect(branches).toHaveLength(2)
    for (const branch of branches) {
      for (const point of branch) {
        expect(shiftAt(point) / level).toBeCloseTo(1, 9)
        expect(Math.abs(point.x)).toBeLessThanOrEqual(PLANE.x + 1e-12)
        expect(Math.abs(point.y)).toBeLessThanOrEqual(PLANE.y + 1e-9)
      }
    }
  })

  it('starts each branch on the edge of the plane', () => {
    for (const branch of contour(2000)) {
      expect(Math.abs(branch[0]?.y ?? 0)).toBeCloseTo(PLANE.y, 9)
      expect(Math.abs(branch.at(-1)?.x ?? 0)).toBeCloseTo(PLANE.x, 12)
    }
  })

  it('has no branch for a level that does not reach the plane, nor for zero', () => {
    expect(contour(shiftScale)).toEqual([])
    expect(contour(0)).toEqual([])
  })
})

describe('contourLabelPoints', () => {
  it.each(CONTOUR_LEVELS)('puts the labels of %s on the contour, on the diagonals', level => {
    for (const point of contourLabelPoints(level)) {
      expect(shiftAt(point) / level).toBeCloseTo(1, 9)
      expect(Math.abs(point.x) / PLANE.x).toBeCloseTo(Math.abs(point.y) / PLANE.y, 12)
      expect(Math.abs(point.x)).toBeLessThan(PLANE.x)
    }
  })
})
