import lalonde from '@site/src/data/generated/lalonde-correlations.json'

/**
 * Model behind the correlation figure of Problem 1.4: the correlations of the
 * LaLonde observational data, and the change of the coefficient of `treat`
 * when one covariate is added to the regression of `re78` on `treat`, all
 * computed by `lalonde_correlations()` in the R package.
 *
 * Write Y for `re78`, Z for `treat` and X for a covariate. The change is
 *
 *   Delta = -K rho_ZX rho_YX|Z / sqrt(1 - rho_ZX^2),
 *
 * with the same K for every covariate, so the plane of (rho_ZX, rho_YX|Z) is
 * a map of Delta. This module evaluates that map and its contours, and each
 * function is covered by `model.test.ts`.
 */

export type Covariate = (typeof lalonde.covariates)[number]

/** A point of the plane: rho_ZX (x) and rho_YX|Z (y). */
export interface PlanePoint {
  readonly x: number
  readonly y: number
}

/** The outcome, the treatment, the earnings history and the demographics, in this order. */
export const variables: readonly string[] = lalonde.variables
export const groups: readonly string[] = lalonde.groups
export const covariates: readonly Covariate[] = lalonde.covariates
/** Coefficient of `treat` in the regression without covariates. */
export const baseline: number = lalonde.baseline
/** The constant K of the change of the coefficient. */
export const shiftScale: number = lalonde.shift_scale

/** Half-widths of the plane: every covariate lies inside, with room for its label. */
export const PLANE: PlanePoint = { x: 0.35, y: 0.8 }

/** Contour levels of the change of the coefficient, in 1978 US dollars. */
export const CONTOUR_LEVELS: readonly number[] = [
  1000, 2000, 4000, 8000, -1000, -2000, -4000, -8000
]

/** The sample correlation of the variables at two indices of `variables`. */
export function correlation(row: number, column: number): number {
  const value = lalonde.correlations[row]?.[column]
  if (value === undefined) {
    throw new RangeError(`No correlation at (${row}, ${column})`)
  }
  return value
}

/** Index in `variables` of the variable with this name, or -1. */
export function variableIndex(name: string): number {
  return variables.indexOf(name)
}

/** Where a covariate sits in the plane. */
export function planePoint(covariate: Covariate): PlanePoint {
  return { x: covariate.rho_zx, y: covariate.rho_yx_z }
}

/** Change of the coefficient of `treat` when a covariate at this point of the plane is added alone. */
export function shiftAt({ x, y }: PlanePoint): number {
  return (-shiftScale * x * y) / Math.sqrt(1 - x * x)
}

/**
 * The contour `shiftAt = level` inside the plane, as its two branches, each
 * sampled from the edge of the plane, where |y| = PLANE.y, out to |x| =
 * PLANE.x. Along a branch y = -level sqrt(1 - x^2) / (K x), and the edge is
 * where |x| = |level| / sqrt(K^2 PLANE.y^2 + level^2).
 */
export function contour(level: number, samples = 64): PlanePoint[][] {
  const edge = Math.abs(level) / Math.hypot(shiftScale * PLANE.y, level)
  if (level === 0 || edge >= PLANE.x) {
    return []
  }

  return [-1, 1].map(side =>
    Array.from({ length: samples }, (_unused, index) => {
      const x = side * (edge + ((PLANE.x - edge) * index) / (samples - 1))
      return { x, y: (-level * Math.sqrt(1 - x * x)) / (shiftScale * x) }
    })
  )
}

/**
 * Where the label of a contour goes: on each branch, the point that lies on
 * the diagonal of its quadrant, x / PLANE.x = +-y / PLANE.y. With x = s t a and
 * y = r t b (a, b the half-widths, s, r the signs), t^2 = u solves
 * K^2 a^2 b^2 u^2 + level^2 a^2 u - level^2 = 0.
 */
export function contourLabelPoints(level: number): PlanePoint[] {
  const a = PLANE.x
  const b = PLANE.y
  const k = shiftScale
  const quadratic = k * k * a * a * b * b
  const linear = level * level * a * a
  const u = (-linear + Math.sqrt(linear * linear + 4 * quadratic * level * level)) / (2 * quadratic)
  const t = Math.sqrt(u)
  // A positive change needs opposite signs of x and y, a negative one equal signs.
  const ySign = level > 0 ? -1 : 1

  return [-1, 1].map(xSign => ({ x: xSign * t * a, y: ySign * xSign * t * b }))
}

/** Side of its point on which the label of a covariate is set, chosen so that the labels of close covariates part. */
export const LABEL_SIDE: Readonly<Record<string, 'left' | 'right' | 'above' | 'below'>> = {
  re74: 'right',
  re75: 'left',
  u74: 'right',
  u75: 'left',
  age: 'left',
  educ: 'right',
  black: 'above',
  hispan: 'left',
  married: 'left',
  nodegree: 'right'
}
