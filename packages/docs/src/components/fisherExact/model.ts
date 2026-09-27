import resume from '@site/src/data/generated/resume-callbacks.json'

/**
 * Model behind the figures on Fisher's exact test: the callbacks of Example 1.1
 * and their exact null distribution, both computed by `resume_callbacks()` in
 * the R package, and the random deals of the names that the figures animate.
 *
 * The resumes are numbered as slots: slots below `resumes.white` form the pile
 * of White-sounding names (Z = 1), the others the pile of Black-sounding names
 * (Z = 0).
 */

export type NullRow = (typeof resume.null.distribution)[number]

/** A source of uniform random numbers in [0, 1), such as `Math.random`. */
export type Random = () => number

/** Where the called-back resumes lie, and how many carry White-sounding names. */
export interface Deal {
  /** Slots of the called-back resumes, in increasing order. */
  readonly callbackSlots: readonly number[]
  /** The count X: called-back resumes with White-sounding names. */
  readonly white: number
}

export const resumes = resume.resumes
export const callbacks = resume.callbacks
export const nullDistribution: readonly NullRow[] = resume.null.distribution
export const expected = resume.null.expected
export const standardDeviation = resume.null.sd
export const pValue = resume.p_value

export const totalResumes = resumes.white + resumes.black
export const totalCallbacks = callbacks.white + callbacks.black

/** Relative tolerance with which `fisher.test` and the R package compare probabilities. */
const RELATIVE_TOLERANCE = 1 + 1e-7

const probabilityByCount = new Map(nullDistribution.map(row => [row.k, row.probability]))

/** Null probability that X equals `k`. */
export function probabilityOf(k: number): number {
  return probabilityByCount.get(k) ?? 0
}

/** Whether the count `k` is no more likely than `observed`, which makes it at least as extreme. */
export function isExtreme(k: number, observed: number): boolean {
  return probabilityOf(k) <= probabilityOf(observed) * RELATIVE_TOLERANCE
}

/**
 * Two-sided p-value had `observed` callbacks gone to White-sounding names: the
 * null probability of every count at least as extreme, the rule of the R
 * package and of `fisher.test`.
 */
export function twoSidedPValue(observed: number): number {
  return nullDistribution.reduce(
    (sum, row) => (isExtreme(row.k, observed) ? sum + row.probability : sum),
    0
  )
}

/** Null probability of at least `observed` callbacks among White-sounding names. */
export function upperTail(observed: number): number {
  return nullDistribution.reduce((sum, row) => (row.k >= observed ? sum + row.probability : sum), 0)
}

/** Null probability of at most `observed` callbacks among White-sounding names. */
export function lowerTail(observed: number): number {
  return nullDistribution.reduce((sum, row) => (row.k <= observed ? sum + row.probability : sum), 0)
}

/**
 * Draws `count` distinct slots from 0 to `size` - 1, each set of slots equally
 * likely, by Floyd's algorithm, and returns them in increasing order.
 */
export function sampleSlots(count: number, size: number, random: Random): number[] {
  const chosen = new Set<number>()

  for (let candidate = size - count; candidate < size; candidate++) {
    const slot = Math.floor(random() * (candidate + 1))
    chosen.add(chosen.has(slot) ? candidate : slot)
  }

  return [...chosen].sort((a, b) => a - b)
}

/**
 * One deal of the names under the null hypothesis: the called-back resumes
 * keep their callbacks, and the names are dealt at random, so the 392 called-
 * back resumes land in 392 slots drawn at random from the 4870.
 */
export function deal(random: Random): Deal {
  const callbackSlots = sampleSlots(totalCallbacks, totalResumes, random)

  return {
    callbackSlots,
    white: callbackSlots.filter(slot => slot < resumes.white).length
  }
}

/**
 * The experiment as it turned out, laid out in the same slots: 235 called-back
 * resumes in the pile of White-sounding names and 157 in the other, at random
 * positions within each pile.
 */
export function observedDeal(random: Random): Deal {
  const white = sampleSlots(callbacks.white, resumes.white, random)
  const black = sampleSlots(callbacks.black, resumes.black, random).map(
    slot => slot + resumes.white
  )

  return { callbackSlots: [...white, ...black], white: callbacks.white }
}
