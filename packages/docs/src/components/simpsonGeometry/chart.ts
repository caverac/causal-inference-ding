import { CHART_FONT_FAMILY, CHART_FONT_SIZE, styleAxis } from '@site/src/components/chartStyle'
import { appendMathText } from '@site/src/components/math/formula'
import {
  placeLabels,
  type LabelLayout,
  type Side
} from '@site/src/components/simpsonGeometry/labels'
import {
  ARMS,
  controlVectors,
  pieceOf,
  planeExtent,
  sameVector,
  treatedVectors,
  vectorName,
  vectorsAt,
  type Arm,
  type Example,
  type Piece,
  type Point,
  type VectorId
} from '@site/src/components/simpsonGeometry/model'
import * as d3 from 'd3'

export interface PlaneChart {
  /**
   * Redraws the treated arm with a share of its units in the subgroup X = 1,
   * and brings forward the focused vector, if any.
   */
  readonly update: (share: number, focus: VectorId | null) => void
  readonly destroy: () => void
}

export interface PlaneChartOptions {
  /** Id of the arrowhead marker, unique on the page. */
  readonly markerId: string
  /** Called with the share under the pointer while the tip of A is dragged. */
  readonly onShare: (share: number) => void
  /** Called with a vector when the pointer enters it, and when the pointer leaves it. */
  readonly onEnter: (vector: VectorId) => void
  readonly onLeave: (vector: VectorId) => void
}

const MARGIN = { top: 20, right: 32, bottom: 48, left: 64 } as const
/** Height of the plane relative to its width, and its bounds in pixels. */
const ASPECT = 0.62
const MIN_HEIGHT = 200
const MAX_HEIGHT = 420
/** Target spacing between the ticks of an axis. */
const TICK_SPACING = 90
/** Placement of the labels at the tips, before the size of the plane is known. */
const LABEL_LAYOUT: Omit<LabelLayout, 'bounds'> = {
  offset: 14,
  width: 22,
  height: 16,
  step: 4,
  maxSteps: 12,
  minLength: 18
}
/** Shortest vector, on the screen, that carries an arrowhead. */
const MIN_ARROW_LENGTH = 14
/** Radius of the handle that drags the tip of A. */
const HANDLE_RADIUS = 14
/** Width of the invisible strokes that catch the pointer over a vector. */
const HIT_WIDTH = 14
/** Opacity of what is not focused while a vector is. */
const FADED = 0.2

/** Solid for the treated arm (Z = 1), dashed for the control arm (Z = 0), as in the Berkeley figure. */
const DASH: Readonly<Record<Arm, string>> = { treated: 'none', control: '6 4' }
/** In the order in which their labels claim space: the sums first. */
const PIECES: readonly Piece[] = ['aggregated', '1', '0']

const DRAWN: readonly VectorId[] = PIECES.flatMap(piece => ARMS.map(arm => ({ arm, piece })))

/**
 * Whether a vector stays in full ink while another is focused: the focused
 * one, and with a sum its two terms, which span its parallelogram.
 */
function inFocus(focus: VectorId | null, drawn: VectorId): boolean {
  return (
    focus === null ||
    sameVector(focus, drawn) ||
    (focus.piece === 'aggregated' && focus.arm === drawn.arm)
  )
}

/**
 * Side a label leans to, away from the parallelogram: a sum's label sits
 * ahead of its tip, the steeper vector of an arm has its label on its left
 * and the flatter one on its right. The far side of the parallelogram leaves
 * the tip of a subgroup vector in the direction of the other one, so the
 * label keeps clear of it.
 */
function sideOf(data: Example, { arm, piece }: VectorId): Side {
  if (piece === 'aggregated') {
    return 0
  }
  const other = piece === '1' ? '0' : '1'
  return data[arm].subgroups[piece].rate > data[arm].subgroups[other].rate ? -1 : 1
}

/**
 * Draws a two-by-two-by-two table as in Figure 1.2 of the book: each arm of
 * each subgroup is the vector (failures, successes) from the origin, and the
 * aggregated vector of an arm is the diagonal of the parallelogram its two
 * subgroup vectors span. Dotted, the ray of B, and the line along which the
 * tip of A slides when the treated arm's units move between the subgroups;
 * they cross at the share where the aggregated risk difference changes sign.
 *
 * The axes are scaled separately. Scaling an axis keeps sums of vectors and
 * the order of slopes, so every comparison the figure makes survives it.
 */
export function createPlaneChart(
  svgElement: SVGSVGElement,
  width: number,
  data: Example,
  options: PlaneChartOptions
): PlaneChart {
  const plotWidth = Math.max(width - MARGIN.left - MARGIN.right, 1)
  const planeHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, plotWidth * ASPECT))
  const height = MARGIN.top + planeHeight + MARGIN.bottom
  const extent = planeExtent(data)

  const x = d3.scaleLinear().domain([0, extent.x]).nice().range([0, plotWidth])
  const y = d3.scaleLinear().domain([0, extent.y]).nice().range([planeHeight, 0])
  // The ends of the axes, rounded up by nice().
  const xMax = x.invert(plotWidth)
  const yMax = y.invert(0)
  const screen = (point: Point): [number, number] => [x(point.x), y(point.y)]
  const origin = screen({ x: 0, y: 0 })

  const svg = d3.select(svgElement)
  svg.selectAll('*').remove()
  svg
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('font-family', CHART_FONT_FAMILY)
    .attr('font-size', CHART_FONT_SIZE)
    .attr('fill', 'currentColor')

  svg
    .append('defs')
    .append('marker')
    .attr('id', options.markerId)
    .attr('viewBox', '0 0 10 10')
    .attr('refX', 10)
    .attr('refY', 5)
    .attr('markerWidth', 9)
    .attr('markerHeight', 9)
    .attr('markerUnits', 'userSpaceOnUse')
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M0,1L10,5L0,9Z')
    .attr('fill', 'currentColor')

  const root = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)
  const ticks = Math.max(2, Math.floor(plotWidth / TICK_SPACING))

  styleAxis(
    root
      .append('g')
      .attr('transform', `translate(0,${planeHeight})`)
      .call(d3.axisBottom(x).ticks(ticks).tickFormat(d3.format('~s')))
  )
  styleAxis(root.append('g').call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('~s'))))
  appendMathText(
    root
      .append('text')
      .attr('x', plotWidth / 2)
      .attr('y', planeHeight + 38)
      .attr('text-anchor', 'middle'),
    'n_{z0}'
  )
  appendMathText(
    root
      .append('text')
      .attr('transform', `translate(${-MARGIN.left + 16},${planeHeight / 2}) rotate(-90)`)
      .attr('text-anchor', 'middle'),
    'n_{z1}'
  )

  // ---------------------------------------------------------------------------
  // Guides: the ray of B, and the line along which the tip of A slides
  // ---------------------------------------------------------------------------

  const control = controlVectors(data)
  const guides = root
    .append('g')
    .attr('stroke', 'currentColor')
    .attr('stroke-dasharray', '1 3')
    .attr('stroke-opacity', 0.6)
  // The ray of B from its tip on, so that it does not run over B itself.
  const rayScale = Math.min(xMax / control.aggregated.x, yMax / control.aggregated.y)
  guides
    .append('line')
    .attr('x1', x(control.aggregated.x))
    .attr('y1', y(control.aggregated.y))
    .attr('x2', x(rayScale * control.aggregated.x))
    .attr('y2', y(rayScale * control.aggregated.y))
  const trackStart = treatedVectors(data, 0).aggregated
  const trackEnd = treatedVectors(data, 1).aggregated
  guides
    .append('line')
    .attr('x1', x(trackStart.x))
    .attr('y1', y(trackStart.y))
    .attr('x2', x(trackEnd.x))
    .attr('y2', y(trackEnd.y))
  const crossing = treatedVectors(data, data.sign_change_at).aggregated
  root
    .append('circle')
    .attr('cx', x(crossing.x))
    .attr('cy', y(crossing.y))
    .attr('r', 4)
    .attr('fill', 'none')
    .attr('stroke', 'currentColor')

  // ---------------------------------------------------------------------------
  // The parallelograms
  // ---------------------------------------------------------------------------

  // The far sides: from the tip of each subgroup vector to the tip of the sum.
  const sides = root
    .append('g')
    .attr('stroke', 'currentColor')
    .attr('stroke-opacity', 0.35)
    .selectAll<SVGLineElement, VectorId>('line')
    .data(DRAWN.filter(drawn => drawn.piece !== 'aggregated'))
    .join('line')
    .attr('stroke-dasharray', drawn => DASH[drawn.arm])

  const vectors = root
    .append('g')
    .attr('stroke', 'currentColor')
    .selectAll<SVGLineElement, VectorId>('line')
    .data(DRAWN)
    .join('line')
    .attr('x1', x(0))
    .attr('y1', y(0))
    .attr('stroke-width', drawn => (drawn.piece === 'aggregated' ? 2.25 : 1.5))
    .attr('stroke-dasharray', drawn => DASH[drawn.arm])

  const labels = root
    .append('g')
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .selectAll<SVGTextElement, VectorId>('text')
    .data(DRAWN)
    .join('text')
  labels.each((drawn, index, nodes) => {
    const node = nodes[index]
    if (node !== undefined) {
      appendMathText(d3.select(node), vectorName(drawn))
    }
  })

  // Invisible strokes over the vectors, which pair each with its row of the
  // tables while the pointer is on it.
  const hits = root
    .append('g')
    .attr('stroke', 'transparent')
    .attr('stroke-width', HIT_WIDTH)
    .attr('stroke-linecap', 'round')
    .selectAll<SVGLineElement, VectorId>('line')
    .data(DRAWN)
    .join('line')
    .attr('class', 'explorer__hit')
    .attr('x1', x(0))
    .attr('y1', y(0))
    .on('pointerenter', (_event: PointerEvent, drawn) => {
      options.onEnter(drawn)
    })
    .on('pointerleave', (_event: PointerEvent, drawn) => {
      options.onLeave(drawn)
    })

  // ---------------------------------------------------------------------------
  // Dragging the tip of A along its line
  // ---------------------------------------------------------------------------

  const [startX, startY] = screen(trackStart)
  const [endX, endY] = screen(trackEnd)
  const trackLength2 = (endX - startX) ** 2 + (endY - startY) ** 2
  /** Share of the point of the track nearest to the pointer, in [0, 1]. */
  const shareAt = (event: PointerEvent): number => {
    const [px, py] = d3.pointer(event, root.node())
    const along = ((px - startX) * (endX - startX) + (py - startY) * (endY - startY)) / trackLength2

    return Math.min(1, Math.max(0, along))
  }
  const handle = root
    .append('circle')
    .attr('class', 'explorer__drag')
    .attr('r', HANDLE_RADIUS)
    .attr('fill', 'transparent')
  handle
    .on('pointerdown', (event: PointerEvent) => {
      handle.node()?.setPointerCapture(event.pointerId)
      options.onShare(shareAt(event))
    })
    .on('pointermove', (event: PointerEvent) => {
      if (handle.node()?.hasPointerCapture(event.pointerId) === true) {
        options.onShare(shareAt(event))
      }
    })

  // ---------------------------------------------------------------------------
  // Updates
  // ---------------------------------------------------------------------------

  const update = (share: number, focus: VectorId | null): void => {
    const arms = vectorsAt(data, share)
    const tip = (drawn: VectorId): [number, number] => screen(pieceOf(arms[drawn.arm], drawn.piece))
    const length = (drawn: VectorId): number => {
      const [tx, ty] = tip(drawn)
      return Math.hypot(tx - origin[0], ty - origin[1])
    }

    vectors
      .attr('x2', drawn => tip(drawn)[0])
      .attr('y2', drawn => tip(drawn)[1])
      .attr('marker-end', drawn =>
        length(drawn) >= MIN_ARROW_LENGTH ? `url(#${options.markerId})` : null
      )
      .attr('opacity', drawn => (inFocus(focus, drawn) ? 1 : FADED))
    hits.attr('x2', drawn => tip(drawn)[0]).attr('y2', drawn => tip(drawn)[1])
    sides
      .attr('x1', drawn => tip(drawn)[0])
      .attr('y1', drawn => tip(drawn)[1])
      .attr('x2', drawn => x(arms[drawn.arm].aggregated.x))
      .attr('y2', drawn => y(arms[drawn.arm].aggregated.y))
      .attr('opacity', drawn =>
        inFocus(focus, { arm: drawn.arm, piece: 'aggregated' }) ? 1 : FADED
      )

    // Placements keep the order of DRAWN, the order the labels were joined in.
    const placements = placeLabels(
      DRAWN.map(drawn => ({
        vector: drawn,
        from: origin,
        to: tip(drawn),
        side: sideOf(data, drawn)
      })),
      { ...LABEL_LAYOUT, bounds: [plotWidth, planeHeight] }
    )
    labels
      .data(placements)
      .attr('x', ({ position }) => (position === null ? null : position[0]))
      .attr('y', ({ position }) => (position === null ? null : position[1]))
      .attr('opacity', ({ request, position }) => {
        if (position === null) return 0
        return inFocus(focus, request.vector) ? 1 : FADED
      })

    const [ax, ay] = screen(arms.treated.aggregated)
    handle.attr('cx', ax).attr('cy', ay)
  }

  const destroy = (): void => {
    svg.selectAll('*').remove()
  }

  return { update, destroy }
}
