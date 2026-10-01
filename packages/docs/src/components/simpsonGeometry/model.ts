import examples from '@site/src/data/generated/yule-simpson-examples.json'

/**
 * Model behind the figures of Problem 1.2: two-by-two-by-two tables computed
 * by `yule_simpson_examples()` in the R package, placed in the plane of Figure
 * 1.2 of Ding (2024), with failures along the horizontal axis and successes
 * along the vertical one.
 *
 * Every count, rate and share comes from R; this module only moves the
 * treated arm's units between the two subgroups, and each computation is
 * covered by `model.test.ts`.
 */

export type ExampleName = keyof typeof examples
export type Example = (typeof examples)[ExampleName]

/** The levels of X, in the order of the book: X = 1, then X = 0. */
export const SUBGROUPS = ['1', '0'] as const
export type Subgroup = (typeof SUBGROUPS)[number]

/** A point in the plane: failures (x) and successes (y). */
export interface Point {
  readonly x: number
  readonly y: number
}

/** The vectors of one arm: one per subgroup, and their sum. */
export interface ArmVectors {
  readonly subgroups: Readonly<Record<Subgroup, Point>>
  readonly aggregated: Point
}

/** The treated arm (Z = 1), whose vectors the book names A, and the control arm (Z = 0), named B. */
export const ARMS = ['treated', 'control'] as const
export type Arm = (typeof ARMS)[number]

/** A subgroup vector, or the aggregated one. */
export type Piece = Subgroup | 'aggregated'

/** One of the six vectors of the plane, and one row of the tables. */
export interface VectorId {
  readonly arm: Arm
  readonly piece: Piece
}

export function example(name: ExampleName): Example {
  return examples[name]
}

/** The vector of `units` units succeeding at `rate`: its slope is the odds of success. */
function vectorOf(units: number, rate: number): Point {
  return { x: units * (1 - rate), y: units * rate }
}

function sum(first: Point, second: Point): Point {
  return { x: first.x + second.x, y: first.y + second.y }
}

/** Number of units in the treated arm, over both subgroups. */
export function treatedUnits(data: Example): number {
  return data.treated.aggregated.failures + data.treated.aggregated.successes
}

/**
 * The treated arm with a share `share` of its units in the subgroup X = 1,
 * each subgroup keeping its observed success rate. At the observed share these
 * are the observed vectors A_1, A_0 and A.
 */
export function treatedVectors(data: Example, share: number): ArmVectors {
  const units = treatedUnits(data)
  const one = vectorOf(units * share, data.treated.subgroups['1'].rate)
  const zero = vectorOf(units * (1 - share), data.treated.subgroups['0'].rate)

  return { subgroups: { '1': one, '0': zero }, aggregated: sum(one, zero) }
}

/** The observed vectors B_1, B_0 and B of the control arm. */
export function controlVectors(data: Example): ArmVectors {
  const point = (vector: { readonly failures: number; readonly successes: number }): Point => ({
    x: vector.failures,
    y: vector.successes
  })

  return {
    subgroups: {
      '1': point(data.control.subgroups['1']),
      '0': point(data.control.subgroups['0'])
    },
    aggregated: point(data.control.aggregated)
  }
}

/** The vectors of both arms, with a share `share` of the treated arm's units in X = 1. */
export function vectorsAt(data: Example, share: number): Readonly<Record<Arm, ArmVectors>> {
  return { treated: treatedVectors(data, share), control: controlVectors(data) }
}

/** The vector of an arm for a subgroup, or its aggregated vector. */
export function pieceOf(vectors: ArmVectors, piece: Piece): Point {
  return piece === 'aggregated' ? vectors.aggregated : vectors.subgroups[piece]
}

/** The book's name of a vector: A for the treated arm, B for the control arm, subscripted by X. */
export function vectorName({ arm, piece }: VectorId): string {
  const letter = arm === 'treated' ? 'A' : 'B'
  return piece === 'aggregated' ? letter : `${letter}_{${piece}}`
}

export function sameVector(first: VectorId | null, second: VectorId): boolean {
  return first !== null && first.arm === second.arm && first.piece === second.piece
}

/**
 * The focus once the pointer or the keyboard leaves a vector: cleared if that
 * vector held it, and kept otherwise. Leaving one element and entering the
 * next can arrive in either order, so a late leave must not clear the focus
 * the next element has just taken.
 */
export function focusAfterLeaving(focus: VectorId | null, left: VectorId): VectorId | null {
  return sameVector(focus, left) ? null : focus
}

/**
 * Aggregated success rate of the treated arm at a share: the average of its
 * subgroup rates weighted by its units in each, so the tip of A slides along
 * the line of points with `treatedUnits` units as the share moves.
 */
export function treatedRate(data: Example, share: number): number {
  return share * data.treated.subgroups['1'].rate + (1 - share) * data.treated.subgroups['0'].rate
}

/** Aggregated risk difference, pr(Y = 1 | Z = 1) - pr(Y = 1 | Z = 0), at a share. */
export function riskDifference(data: Example, share: number): number {
  return treatedRate(data, share) - data.control.aggregated.rate
}

/**
 * Smallest box, anchored at the origin, that holds every vector at every
 * share. The treated vectors are linear in the share, so the shares 0 and 1
 * bound them.
 */
export function planeExtent(data: Example): Point {
  const arms = [treatedVectors(data, 0), treatedVectors(data, 1), controlVectors(data)]
  const points = arms.flatMap(arm => [arm.subgroups['1'], arm.subgroups['0'], arm.aggregated])

  return {
    x: Math.max(...points.map(point => point.x)),
    y: Math.max(...points.map(point => point.y))
  }
}
