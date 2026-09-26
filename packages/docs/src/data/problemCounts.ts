/** Name under which the problem counts are published as plugin data. */
export const PROBLEM_COUNTS_PLUGIN = 'problem-counts'

/**
 * Number of solved problems on each solution page, keyed by the document id of
 * the page, for example 'parts/part1/chapter01'.
 */
export type ProblemCounts = Readonly<Record<string, number>>

/**
 * Narrows plugin data, which Docusaurus hands over untyped, to the shape the
 * problem-counts plugin publishes.
 */
export function isProblemCounts(value: unknown): value is ProblemCounts {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  return Object.values(value as Record<string, unknown>).every(
    count => typeof count === 'number' && Number.isInteger(count) && count >= 0
  )
}
