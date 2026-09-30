/** A point on the screen, in pixels, with y growing downward. */
export type Screen = readonly [number, number]

/**
 * Side of its vector a label leans to: -1 for the left of the direction of
 * travel on the screen, 1 for the right, and 0 for straight ahead.
 */
export type Side = -1 | 0 | 1

export interface LabelRequest {
  /** Start and tip of the vector the label names. */
  readonly from: Screen
  readonly to: Screen
  readonly side: Side
}

export interface LabelLayout {
  /** Distance of a label from the tip of its vector. */
  readonly offset: number
  /** Size of the box a label occupies, centered on its position. */
  readonly width: number
  readonly height: number
  /** Distance a label moves sideways each time it collides with an earlier one. */
  readonly step: number
  /** Most sideways moves a label makes before it stays where it is. */
  readonly maxSteps: number
  /** Shortest vector that gets a label. */
  readonly minLength: number
  /** Far corner of the box, anchored at the origin, that every label stays in. */
  readonly bounds: Screen
}

function overlaps(first: Screen, second: Screen, layout: LabelLayout): boolean {
  return (
    Math.abs(first[0] - second[0]) < layout.width && Math.abs(first[1] - second[1]) < layout.height
  )
}

function clamp(point: Screen, layout: LabelLayout): Screen {
  const halfWidth = layout.width / 2
  const halfHeight = layout.height / 2

  return [
    Math.min(layout.bounds[0] - halfWidth, Math.max(halfWidth, point[0])),
    Math.min(layout.bounds[1] - halfHeight, Math.max(halfHeight, point[1]))
  ]
}

/** A request with the center of its label, or null when its vector gets none. */
export interface Placement<Request extends LabelRequest> {
  readonly request: Request
  readonly position: Screen | null
}

/**
 * Places the label of each vector near its tip: straight ahead, or halfway
 * between ahead and the side it leans to. A label whose box would overlap the
 * box of a label placed before it moves further to its side (to the right for
 * a label straight ahead) until it clears, so the order of the requests is
 * their priority. Every label stays inside the bounds, and a vector shorter
 * than `minLength` gets no label. The placements keep the order of the
 * requests.
 */
export function placeLabels<Request extends LabelRequest>(
  requests: readonly Request[],
  layout: LabelLayout
): Placement<Request>[] {
  const placed: Screen[] = []

  return requests.map(request => {
    const { from, to, side } = request
    const dx = to[0] - from[0]
    const dy = to[1] - from[1]
    const length = Math.hypot(dx, dy)
    if (length < layout.minLength) {
      return { request, position: null }
    }

    const ahead: Screen = [dx / length, dy / length]
    // On a screen with y growing downward, the right of (dx, dy) is (-dy, dx).
    const right: Screen = [-ahead[1], ahead[0]]
    const lean = [ahead[0] + side * right[0], ahead[1] + side * right[1]] as const
    const leanLength = Math.hypot(lean[0], lean[1])
    const push = side === 0 ? 1 : side

    let position = clamp(
      [
        to[0] + (layout.offset * lean[0]) / leanLength,
        to[1] + (layout.offset * lean[1]) / leanLength
      ],
      layout
    )
    for (
      let moves = 0;
      moves < layout.maxSteps && placed.some(other => overlaps(position, other, layout));
      moves++
    ) {
      position = clamp(
        [position[0] + push * layout.step * right[0], position[1] + push * layout.step * right[1]],
        layout
      )
    }

    placed.push(position)
    return { request, position }
  })
}
