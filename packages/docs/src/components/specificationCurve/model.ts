import lalonde from '@site/src/data/generated/lalonde-specifications.json'

/**
 * Model behind the specification curve of Problem 1.4: the 1024 regressions
 * of `re78` on `treat` and every subset of ten covariates, fitted by
 * `lalonde_specifications()` in the R package and ordered there by the
 * estimated coefficient of `treat`.
 *
 * Every estimate, interval, p-value and significance comes from R; this
 * module only selects and counts them, and each function is covered by
 * `model.test.ts`.
 */

export type Specification = (typeof lalonde.specifications)[number]

/** The covariates, in the order of the indicators of every specification. */
export const covariates: readonly string[] = lalonde.covariates
/** The specifications, by increasing estimate: the index of one is its rank. */
export const specifications: readonly Specification[] = lalonde.specifications
export const level: number = lalonde.level

/** Numbers of positively significant, negatively significant and insignificant coefficients. */
export interface SignificanceCounts {
  readonly positive: number
  readonly negative: number
  readonly none: number
}

/** Whether the regression of a specification includes the covariate at `index` of `covariates`. */
export function includes(specification: Specification, index: number): boolean {
  return specification.included[index] === true
}

/** The covariates of the regression of a specification, in the order of `covariates`. */
export function includedCovariates(specification: Specification): string[] {
  return covariates.filter((_name, index) => includes(specification, index))
}

export function isSignificant(specification: Specification): boolean {
  return specification.significance !== 'none'
}

/** Counts the significance of the coefficients of some specifications. */
export function countSignificance(selected: readonly Specification[]): SignificanceCounts {
  const count = (significance: string): number =>
    selected.filter(specification => specification.significance === significance).length

  return { positive: count('positive'), negative: count('negative'), none: count('none') }
}

/**
 * The specifications with and without a covariate, which split the 1024 in
 * two halves of 512.
 */
export function splitByCovariate(index: number): {
  readonly with: Specification[]
  readonly without: Specification[]
} {
  return {
    with: specifications.filter(specification => includes(specification, index)),
    without: specifications.filter(specification => !includes(specification, index))
  }
}

/** Rank of the regression without covariates, and of the one with all of them. */
export function bookRanks(): { readonly none: number; readonly all: number } {
  return {
    none: specifications.findIndex(specification => !specification.included.some(Boolean)),
    all: specifications.findIndex(specification => specification.included.every(Boolean))
  }
}

/**
 * A p-value for display: three decimals, or two significant digits in
 * scientific notation below 0.001.
 */
export function formatPValue(p: number): string {
  return p < 0.001 ? p.toExponential(1) : p.toFixed(3)
}
