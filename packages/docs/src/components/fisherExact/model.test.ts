import {
  callbacks,
  deal,
  expected,
  isExtreme,
  lowerTail,
  nullDistribution,
  observedDeal,
  pValue,
  probabilityOf,
  resumes,
  sampleSlots,
  totalCallbacks,
  twoSidedPValue,
  upperTail,
  type Random
} from '@site/src/components/fisherExact/model'
import { describe, expect, it } from 'vitest'

/** Mulberry32, a small seeded generator, so that the random tests are repeatable. */
function seededRandom(seed: number): Random {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Relative closeness, for probabilities that span many orders of magnitude. */
function expectRelativelyClose(actual: number, target: number): void {
  expect(Math.abs(actual - target)).toBeLessThanOrEqual(1e-12 * Math.abs(target))
}

describe('the null distribution', () => {
  it('adds up to one and is centred on half of the callbacks', () => {
    const total = nullDistribution.reduce((sum, row) => sum + row.probability, 0)
    const mean = nullDistribution.reduce((sum, row) => sum + row.k * row.probability, 0)

    expect(total).toBeCloseTo(1, 12)
    expect(mean).toBeCloseTo(totalCallbacks / 2, 9)
    expect(expected).toBe(totalCallbacks / 2)
  })
})

describe('the p-value', () => {
  it('reproduces the tails and the two-sided value computed in R', () => {
    expectRelativelyClose(upperTail(callbacks.white), pValue.upper)
    expectRelativelyClose(lowerTail(callbacks.black), pValue.lower)
    expectRelativelyClose(twoSidedPValue(callbacks.white), pValue.two_sided)
  })

  it('is one at the centre of the distribution', () => {
    expect(twoSidedPValue(expected)).toBeCloseTo(1, 12)
  })

  it('counts exactly the values no more likely than the observed one', () => {
    expect(isExtreme(235, 235)).toBe(true)
    expect(isExtreme(157, 235)).toBe(true)
    expect(isExtreme(158, 235)).toBe(false)
    expect(isExtreme(234, 235)).toBe(false)
    expect(isExtreme(300, 235)).toBe(true)
    expect(probabilityOf(-1)).toBe(0)
  })
})

describe('sampleSlots', () => {
  it('draws the requested number of distinct slots in increasing order', () => {
    const slots = sampleSlots(392, 4870, seededRandom(1))

    expect(slots).toHaveLength(392)
    expect(new Set(slots).size).toBe(392)
    expect(slots.every((slot, index) => index === 0 || slot > (slots[index - 1] ?? -1))).toBe(true)
    expect(slots.every(slot => slot >= 0 && slot < 4870)).toBe(true)
  })

  it('gives every slot the same chance of being drawn', () => {
    const random = seededRandom(2)
    const hits = Array.from({ length: 10 }, () => 0)
    const draws = 20000

    for (let draw = 0; draw < draws; draw++) {
      for (const slot of sampleSlots(3, 10, random)) {
        hits[slot] = (hits[slot] ?? 0) + 1
      }
    }

    for (const count of hits) {
      expect(count / draws).toBeGreaterThan(0.28)
      expect(count / draws).toBeLessThan(0.32)
    }
  })
})

describe('deal', () => {
  it('keeps the 392 callbacks and counts those in the first pile', () => {
    const next = deal(seededRandom(3))

    expect(next.callbackSlots).toHaveLength(totalCallbacks)
    expect(next.white).toBe(next.callbackSlots.filter(slot => slot < resumes.white).length)
  })

  it('centres X on half of the callbacks', () => {
    const random = seededRandom(4)
    const deals = 2000
    let total = 0
    for (let index = 0; index < deals; index++) {
      total += deal(random).white
    }

    // The mean of 2000 deals has a standard deviation of about 0.21.
    expect(Math.abs(total / deals - expected)).toBeLessThan(1)
  })
})

describe('observedDeal', () => {
  it('places the callbacks of the experiment in their piles', () => {
    const layout = observedDeal(seededRandom(5))
    const inFirstPile = layout.callbackSlots.filter(slot => slot < resumes.white).length

    expect(layout.white).toBe(callbacks.white)
    expect(inFirstPile).toBe(callbacks.white)
    expect(layout.callbackSlots.length - inFirstPile).toBe(callbacks.black)
  })
})
