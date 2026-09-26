import berkeley from '@site/src/data/generated/berkeley-admissions.json'

/**
 * Model behind the Yule-Simpson figure: the Berkeley admissions computed by
 * `berkeley_admissions()` in the R package, and the geometry that places them
 * in the plane of Figure 1.2 of Ding (2024), with rejected applicants along the
 * horizontal axis and admitted applicants along the vertical one.
 *
 * Every rate and share comes from R; this module only combines them, and each
 * combination is covered by `model.test.ts`.
 */

/** The treatment of Section 1.4 of the book: Z = 1 for male and Z = 0 for female applicants. */
export type Group = 'male' | 'female'

/**
 * Whether each department keeps its own admission rate, or every department
 * of a group takes the group's aggregated rate.
 */
export type Mode = 'departments' | 'aggregated'

export type Department = (typeof berkeley.departments)[number]

/** A point in the plane: rejected applicants (x) and admitted applicants (y). */
export interface Point {
  readonly x: number
  readonly y: number
}

/** A department's vector in a group's path, laid from the end of the previous one. */
export interface PathSegment {
  readonly department: string
  readonly from: Point
  readonly to: Point
}

export const departments: readonly Department[] = berkeley.departments
export const aggregated = berkeley.aggregated
export const standardized = berkeley.standardized

/**
 * Share of women applying to a department once their distribution over the
 * departments has moved a fraction t of the way to that of men.
 */
export function femaleShare(department: Department, t: number): number {
  return (1 - t) * department.share_female + t * department.share_male
}

/**
 * Aggregated admission rate of women under the shares `femaleShare(d, t)`. The
 * rate is linear in t, so it interpolates the two rates computed in R: the
 * observed one at t = 0 and the one standardized to men's shares at t = 1.
 */
export function femaleRate(t: number): number {
  return (1 - t) * aggregated.rate_female + t * standardized.rate_female
}

/** Aggregated admission rate of a group; only the women's depends on t. */
export function groupRate(group: Group, t: number): number {
  return group === 'male' ? aggregated.rate_male : femaleRate(t)
}

/** Aggregated risk difference, pr(Y = 1 | Z = 1) - pr(Y = 1 | Z = 0), at weight t. */
export function riskDifference(t: number): number {
  return aggregated.rate_male - femaleRate(t)
}

/** Admission rate of a group within a department, which reweighting leaves unchanged. */
export function departmentRate(group: Group, department: Department): number {
  return group === 'male' ? department.rate_male : department.rate_female
}

/** Applicants of a group to a department; the women's follow their shares at weight t. */
function departmentApplicants(group: Group, department: Department, t: number): number {
  return group === 'male'
    ? department.applicants_male
    : aggregated.applicants_female * femaleShare(department, t)
}

/**
 * The departments of a group laid tip to tail, in the order of the data. Each
 * vector is (rejected, admitted), so its slope is the odds of admission in the
 * department and a steeper vector means a higher admission rate. In the
 * aggregated mode every department takes the group's aggregated rate, which
 * straightens the path onto the chord from the origin to its end, and the end
 * itself does not move: that is the law of total probability.
 */
export function pathSegments(group: Group, mode: Mode, t: number): PathSegment[] {
  const pooled = groupRate(group, t)
  const segments: PathSegment[] = []
  let from: Point = { x: 0, y: 0 }

  for (const department of departments) {
    const applicants = departmentApplicants(group, department, t)
    const rate = mode === 'departments' ? departmentRate(group, department) : pooled
    const to: Point = { x: from.x + applicants * (1 - rate), y: from.y + applicants * rate }
    segments.push({ department: department.department, from, to })
    from = to
  }

  return segments
}

/** End of a group's path: its rejected and admitted applicants in total. */
export function pathEnd(group: Group, t: number): Point {
  const applicants = group === 'male' ? aggregated.applicants_male : aggregated.applicants_female
  const rate = groupRate(group, t)

  return { x: applicants * (1 - rate), y: applicants * rate }
}

/**
 * Smallest box, anchored at the origin, that holds both paths at every weight.
 * The women's end moves linearly in t, so its two extremes bound it.
 */
export function planeExtent(): Point {
  const ends = [pathEnd('male', 0), pathEnd('female', 0), pathEnd('female', 1)]

  return {
    x: Math.max(...ends.map(end => end.x)),
    y: Math.max(...ends.map(end => end.y))
  }
}

/**
 * End of the ray from the origin along the direction of a rate, (1 - rate,
 * rate), cut where it leaves the box with the given far corner.
 */
export function rayEnd(rate: number, corner: Point): Point {
  const scale = Math.min(corner.x / (1 - rate), corner.y / rate)

  return { x: scale * (1 - rate), y: scale * rate }
}
