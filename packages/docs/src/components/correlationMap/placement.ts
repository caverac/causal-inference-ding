/** A point on the screen, in pixels, with y growing downward. */
export type Screen = readonly [number, number]

/** A box on the screen, given by its center and size. */
export interface Box {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export function overlaps(first: Box, second: Box): boolean {
  return (
    Math.abs(first.x - second.x) * 2 < first.width + second.width &&
    Math.abs(first.y - second.y) * 2 < first.height + second.height
  )
}

function inside(box: Box, bounds: Screen): boolean {
  return (
    box.x - box.width / 2 >= 0 &&
    box.x + box.width / 2 <= bounds[0] &&
    box.y - box.height / 2 >= 0 &&
    box.y + box.height / 2 <= bounds[1]
  )
}

/**
 * Places a label of the given size on one of the candidate points of a
 * curve: the candidate nearest to `preferred`, along the curve, whose box lies
 * inside the bounds and clears every obstacle. Returns null when no candidate
 * does, so the label is left out rather than drawn over something.
 */
export function placeOnCurve(
  candidates: readonly Screen[],
  preferred: number,
  size: { readonly width: number; readonly height: number },
  obstacles: readonly Box[],
  bounds: Screen
): Box | null {
  const order = candidates
    .map((_point, index) => index)
    .sort((first, second) => Math.abs(first - preferred) - Math.abs(second - preferred))

  for (const index of order) {
    const point = candidates[index]
    if (point === undefined) continue
    const box: Box = { x: point[0], y: point[1], width: size.width, height: size.height }
    if (inside(box, bounds) && !obstacles.some(obstacle => overlaps(box, obstacle))) {
      return box
    }
  }
  return null
}

/** Index of the candidate nearest to a target point. */
export function nearestIndex(candidates: readonly Screen[], target: Screen): number {
  let best = 0
  let bestDistance = Number.POSITIVE_INFINITY
  candidates.forEach((point, index) => {
    const distance = Math.hypot(point[0] - target[0], point[1] - target[1])
    if (distance < bestDistance) {
      best = index
      bestDistance = distance
    }
  })
  return best
}
