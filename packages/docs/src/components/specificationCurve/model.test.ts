import {
  bookRanks,
  countSignificance,
  covariates,
  formatPValue,
  includedCovariates,
  includes,
  isSignificant,
  level,
  specifications,
  splitByCovariate
} from '@site/src/components/specificationCurve/model'
import { describe, expect, it } from 'vitest'

function at(rank: number): (typeof specifications)[number] {
  const specification = specifications[rank]
  if (specification === undefined) {
    throw new Error(`No specification at rank ${rank}`)
  }
  return specification
}

describe('the specifications', () => {
  it('cover the 1024 subsets of the ten covariates once each', () => {
    const subsets = new Set(specifications.map(specification => specification.included.join()))

    expect(covariates).toHaveLength(10)
    expect(specifications).toHaveLength(1024)
    expect(subsets.size).toBe(1024)
  })

  it('are ordered by their estimate', () => {
    for (let rank = 1; rank < specifications.length; rank++) {
      expect(at(rank).estimate).toBeGreaterThanOrEqual(at(rank - 1).estimate)
    }
  })

  it('hold intervals around their estimates', () => {
    for (const specification of specifications) {
      expect(specification.conf_low).toBeLessThan(specification.estimate)
      expect(specification.conf_high).toBeGreaterThan(specification.estimate)
    }
  })

  it('are significant exactly when the p-value is below the level', () => {
    for (const specification of specifications) {
      expect(isSignificant(specification)).toBe(specification.p_value < level)
    }
  })

  it('are significant exactly when the interval excludes zero', () => {
    for (const specification of specifications) {
      const excludesZero = specification.conf_low > 0 || specification.conf_high < 0
      expect(isSignificant(specification)).toBe(excludesZero)
    }
  })
})

describe('includes and includedCovariates', () => {
  it('read the indicators of a specification', () => {
    const all = at(bookRanks().all)
    const none = at(bookRanks().none)

    expect(covariates.every((_name, index) => includes(all, index))).toBe(true)
    expect(includedCovariates(all)).toEqual(covariates)
    expect(includedCovariates(none)).toEqual([])
  })
})

describe('countSignificance', () => {
  it('reproduces the counts computed in R', () => {
    expect(countSignificance(specifications)).toEqual({ positive: 260, negative: 80, none: 684 })
  })

  it('counts nothing in an empty selection', () => {
    expect(countSignificance([])).toEqual({ positive: 0, negative: 0, none: 0 })
  })
})

describe('splitByCovariate', () => {
  it.each(covariates.map((name, index) => [name, index] as const))(
    'splits the specifications in halves by %s',
    (_name, index) => {
      const split = splitByCovariate(index)

      expect(split.with).toHaveLength(512)
      expect(split.without).toHaveLength(512)
      expect(split.with.every(specification => includes(specification, index))).toBe(true)
    }
  )
})

describe('bookRanks', () => {
  it('finds the two regressions of Section 1.2.1', () => {
    const { none, all } = bookRanks()

    expect(at(none).estimate).toBeCloseTo(-8506.495, 3)
    expect(at(all).estimate).toBeCloseTo(1067.546, 3)
  })
})

describe('formatPValue', () => {
  it('uses three decimals down to 0.001 and scientific notation below', () => {
    expect(formatPValue(0.054025)).toBe('0.054')
    expect(formatPValue(0.001)).toBe('0.001')
    expect(formatPValue(6.91e-33)).toBe('6.9e-33')
  })
})
