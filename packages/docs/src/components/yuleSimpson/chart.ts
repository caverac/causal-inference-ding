import { CHART_FONT_FAMILY, CHART_FONT_SIZE, styleAxis } from '@site/src/components/chartStyle'
import { appendMathText } from '@site/src/components/math/formula'
import {
  departmentRate,
  departments,
  pathEnd,
  pathSegments,
  planeExtent,
  rayEnd,
  riskDifference,
  standardized,
  type Group,
  type Mode,
  type PathSegment,
  type Point
} from '@site/src/components/yuleSimpson/model'
import * as d3 from 'd3'

export interface ChartState {
  readonly mode: Mode
  /** Fraction of the way the women's shares have moved to the men's. */
  readonly t: number
  /** Department under the pointer or the keyboard focus, if any. */
  readonly focus: string | null
}

export interface ChartHandlers {
  readonly onFocus: (department: string | null) => void
  readonly onWeight: (t: number) => void
}

export interface Chart {
  /** Redraws the chart for a state, animating a change of mode or focus. */
  readonly update: (state: ChartState) => void
  /** Draws the paths department by department; the chart is blank until then. */
  readonly reveal: () => void
  readonly destroy: () => void
}

export interface ChartOptions {
  /** Whether the paths were already drawn, as when the chart is rebuilt on a resize. */
  readonly revealed: boolean
}

const MARGIN = { top: 16, right: 56, bottom: 48, left: 64 } as const
/** Space between the plane and the panel of the risk difference, holding the axis label. */
const PANEL_GAP = 64
const LOWER_HEIGHT = 110
const MORPH_MS = 900
const FOCUS_MS = 450
const REVEAL_STEP_MS = 260
/** Distance of a department letter from its vector, and the shortest vector that gets one. */
const LABEL_OFFSET = 11
const MIN_LABELLED_LENGTH = 18
/** Target spacing between the ticks of the plane, which share one step on both axes. */
const TICK_SPACING = 90

const GROUPS: readonly Group[] = ['male', 'female']
/** Solid for male applicants (Z = 1), dashed for female applicants (Z = 0). */
const DASH: Readonly<Record<Group, string>> = { male: 'none', female: '7 5' }
const GROUP_LABEL: Readonly<Record<Group, string>> = { male: 'Z = 1', female: 'Z = 0' }
/** Male labels sit on the left of their vectors and female labels on the right. */
const LABEL_SIDE: Readonly<Record<Group, number>> = { male: 1, female: -1 }

const formatValue = d3.format('.3f')

interface Ray {
  readonly group: Group
  readonly end: Point
}

type Screen = readonly [number, number]

/**
 * Position of a department letter: beside the midpoint of its vector, on the
 * left of the direction of travel for `side = 1` and on the right for `side =
 * -1`. Screen coordinates grow downward, so the left normal of (dx, dy) is
 * (dy, -dx).
 */
function labelPosition(from: Screen, to: Screen, side: number): Screen {
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const length = Math.hypot(dx, dy)
  const scale = length === 0 ? 0 : (side * LABEL_OFFSET) / length

  return [(from[0] + to[0]) / 2 + scale * dy, (from[1] + to[1]) / 2 - scale * dx]
}

function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Draws the admissions of each department as a vector (rejected, admitted),
 * laid tip to tail for each group as in Figure 1.2 of the book, over a panel
 * that follows the aggregated risk difference as the women's distribution over
 * departments is moved to the men's.
 */
export function createChart(
  svgElement: SVGSVGElement,
  width: number,
  handlers: ChartHandlers,
  options: ChartOptions
): Chart {
  const motion = !reducedMotion()
  const extent = planeExtent()
  const plotWidth = Math.max(width - MARGIN.left - MARGIN.right, 1)

  // One scale factor on both axes, so a slope on the screen is a slope in the
  // data and two vectors compare by their angles, as in the book. Both axes
  // are rounded up to a multiple of one common step.
  const roundingStep = d3.tickStep(0, Math.max(extent.x, extent.y), 5)
  const xMax = Math.ceil(extent.x / roundingStep) * roundingStep
  const yMax = Math.ceil(extent.y / roundingStep) * roundingStep
  const planeHeight = (yMax * plotWidth) / xMax
  const x = d3.scaleLinear().domain([0, xMax]).range([0, plotWidth])
  const y = d3.scaleLinear().domain([0, yMax]).range([planeHeight, 0])
  const corner: Point = { x: xMax, y: yMax }
  const screen = (point: Point): Screen => [x(point.x), y(point.y)]

  const height = MARGIN.top + planeHeight + PANEL_GAP + LOWER_HEIGHT + MARGIN.bottom
  const svg = d3.select(svgElement)
  svg.selectAll('*').remove()
  svg
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('font-family', CHART_FONT_FAMILY)
    .attr('font-size', CHART_FONT_SIZE)
    .attr('fill', 'currentColor')

  const root = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)

  // ---------------------------------------------------------------------------
  // The plane of rejected (x) against admitted (y) applicants
  // ---------------------------------------------------------------------------

  const step = d3.tickStep(0, xMax, Math.max(2, Math.floor(plotWidth / TICK_SPACING)))
  // Multiples of the step up to, and never past, the end of an axis.
  const ticksUpTo = (end: number): number[] =>
    d3.range(0, Math.floor(end / step) * step + step / 2, step)
  const axisX = root
    .append('g')
    .attr('transform', `translate(0,${planeHeight})`)
    .call(d3.axisBottom(x).tickValues(ticksUpTo(xMax)).tickFormat(d3.format('d')))
  const axisY = root
    .append('g')
    .call(d3.axisLeft(y).tickValues(ticksUpTo(yMax)).tickFormat(d3.format('d')))
  styleAxis(axisX)
  styleAxis(axisY)

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

  const content = root.append('g').attr('opacity', options.revealed ? 1 : 0)
  const rayLayer = content.append('g').attr('fill', 'none').attr('stroke', 'currentColor')
  const chordLayer = content.append('g').attr('fill', 'none').attr('stroke', 'currentColor')
  const pathLayer = content.append('g').attr('stroke', 'currentColor')
  const labelLayer = content
    .append('g')
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
  const endLayer = content.append('g')
  const hitLayer = content.append('g')

  const chords = chordLayer
    .selectAll<SVGLineElement, Group>('line')
    .data(GROUPS)
    .join('line')
    .attr('x1', x(0))
    .attr('y1', y(0))
    .attr('stroke-width', 1.25)
    .attr('stroke-opacity', 0.55)
    .attr('stroke-dasharray', group => DASH[group])

  const ends = endLayer
    .selectAll<SVGTextElement, Group>('text')
    .data(GROUPS)
    .join('text')
    .attr('dx', 8)
    .attr('dy', group => (group === 'male' ? -6 : 14))
  ends.each((group, index, nodes) => {
    const node = nodes[index]
    if (node !== undefined) {
      appendMathText(d3.select(node), GROUP_LABEL[group])
    }
  })

  const segmentLines = new Map<
    Group,
    d3.Selection<SVGLineElement, PathSegment, SVGGElement, unknown>
  >()
  const vertexDots = new Map<
    Group,
    d3.Selection<SVGCircleElement, PathSegment, SVGGElement, unknown>
  >()
  const letters = new Map<Group, d3.Selection<SVGTextElement, PathSegment, SVGGElement, unknown>>()
  const hits = new Map<Group, d3.Selection<SVGLineElement, PathSegment, SVGGElement, unknown>>()

  for (const group of GROUPS) {
    const initial = pathSegments(group, 'departments', 0)
    const byDepartment = (segment: PathSegment): string => segment.department

    segmentLines.set(
      group,
      pathLayer
        .append('g')
        .attr('stroke-dasharray', DASH[group])
        .attr('stroke-linecap', 'round')
        .selectAll<SVGLineElement, PathSegment>('line')
        .data(initial, byDepartment)
        .join('line')
        .attr('stroke-width', 2)
    )
    vertexDots.set(
      group,
      pathLayer
        .append('g')
        .attr('stroke', 'none')
        .selectAll<SVGCircleElement, PathSegment>('circle')
        .data(initial, byDepartment)
        .join('circle')
        .attr('r', 2.5)
    )
    letters.set(
      group,
      labelLayer
        .append('g')
        .selectAll<SVGTextElement, PathSegment>('text')
        .data(initial, byDepartment)
        .join('text')
        .text(segment => segment.department)
    )
    hits.set(
      group,
      hitLayer
        .append('g')
        .selectAll<SVGLineElement, PathSegment>('line')
        .data(initial, byDepartment)
        .join('line')
        .attr('class', 'explorer__hit')
        .attr('stroke', 'transparent')
        .attr('stroke-width', 16)
        .attr('stroke-linecap', 'round')
        .attr('tabindex', group === 'male' ? 0 : null)
        .attr('role', group === 'male' ? 'button' : null)
        .attr('aria-label', segment => `Department ${segment.department}`)
        .on('pointerenter focus', (_event: Event, segment) => {
          handlers.onFocus(segment.department)
        })
        .on('pointerleave blur', () => {
          handlers.onFocus(null)
        })
    )
  }

  // ---------------------------------------------------------------------------
  // The aggregated risk difference against the weight t
  // ---------------------------------------------------------------------------

  const lower = root.append('g').attr('transform', `translate(0,${planeHeight + PANEL_GAP})`)
  const rdAtZero = riskDifference(0)
  const rdAtOne = riskDifference(1)
  const t = d3.scaleLinear().domain([0, 1]).range([0, plotWidth]).clamp(true)
  const rd = d3
    .scaleLinear()
    .domain([Math.min(0, rdAtZero, rdAtOne), Math.max(0, rdAtZero, rdAtOne)])
    .nice()
    .range([LOWER_HEIGHT, 0])

  const axisT = lower
    .append('g')
    .attr('transform', `translate(0,${LOWER_HEIGHT})`)
    .call(d3.axisBottom(t).tickValues([0, 0.25, 0.5, 0.75, 1]).tickFormat(d3.format('.2~f')))
  const axisRd = lower.append('g').call(d3.axisLeft(rd).ticks(4).tickFormat(d3.format('.2f')))
  styleAxis(axisT)
  styleAxis(axisRd)

  appendMathText(
    lower
      .append('text')
      .attr('x', plotWidth / 2)
      .attr('y', LOWER_HEIGHT + 38)
      .attr('text-anchor', 'middle'),
    't'
  )
  appendMathText(
    lower
      .append('text')
      .attr('transform', `translate(${-MARGIN.left + 16},${LOWER_HEIGHT / 2}) rotate(-90)`)
      .attr('text-anchor', 'middle'),
    'rd'
  )

  lower
    .append('line')
    .attr('x1', 0)
    .attr('x2', plotWidth)
    .attr('y1', rd(0))
    .attr('y2', rd(0))
    .attr('stroke', 'currentColor')
    .attr('stroke-opacity', 0.4)
  lower
    .append('line')
    .attr('x1', t(0))
    .attr('x2', t(1))
    .attr('y1', rd(rdAtZero))
    .attr('y2', rd(rdAtOne))
    .attr('stroke', 'currentColor')
    .attr('stroke-width', 2)

  const signChange = standardized.sign_change_at
  lower
    .append('circle')
    .attr('cx', t(signChange))
    .attr('cy', rd(0))
    .attr('r', 4)
    .attr('fill', 'none')
    .attr('stroke', 'currentColor')
  // Below the zero line and left of the change of sign: the difference is
  // positive there, so its line never passes, nor does the marker's guide.
  appendMathText(
    lower
      .append('text')
      .attr('x', t(signChange) - 8)
      .attr('y', rd(0) + 18)
      .attr('text-anchor', 'end'),
    `t* = ${formatValue(signChange)}`
  )

  const guide = lower
    .append('line')
    .attr('y2', LOWER_HEIGHT)
    .attr('stroke', 'currentColor')
    .attr('stroke-dasharray', '1 3')
  const marker = lower.append('circle').attr('r', 5)
  const markerValue = lower.append('text').attr('dy', -10)

  // The whole panel is a slider: pressing anywhere sets t, and dragging moves it.
  const setWeight = (event: PointerEvent): void => {
    handlers.onWeight(t.invert(d3.pointer(event, lower.node())[0]))
  }
  const dragArea = lower
    .append('rect')
    .attr('class', 'explorer__drag')
    .attr('width', plotWidth)
    .attr('height', LOWER_HEIGHT)
    .attr('fill', 'transparent')
  dragArea
    .on('pointerdown', (event: PointerEvent) => {
      dragArea.node()?.setPointerCapture(event.pointerId)
      setWeight(event)
    })
    .on('pointermove', (event: PointerEvent) => {
      if (dragArea.node()?.hasPointerCapture(event.pointerId) === true) {
        setWeight(event)
      }
    })

  // ---------------------------------------------------------------------------
  // Updates
  // ---------------------------------------------------------------------------

  let current: ChartState | null = null
  /** Whether the paths are still being drawn department by department. */
  let revealing = false

  const labelOpacity = (segment: PathSegment, state: ChartState): number => {
    const [x1, y1] = screen(segment.from)
    const [x2, y2] = screen(segment.to)
    const long = Math.hypot(x2 - x1, y2 - y1) >= MIN_LABELLED_LENGTH
    const visible = state.mode === 'departments' && long
    const faded = state.focus !== null && state.focus !== segment.department

    return visible ? (faded ? 0.3 : 1) : 0
  }

  const drawPaths = (state: ChartState, duration: number): void => {
    for (const group of GROUPS) {
      const segments = pathSegments(group, state.mode, state.t)
      const side = LABEL_SIDE[group]

      segmentLines
        .get(group)
        ?.data(segments, segment => segment.department)
        .transition('geometry')
        .duration(duration)
        .ease(d3.easeCubicInOut)
        .attr('x1', segment => x(segment.from.x))
        .attr('y1', segment => y(segment.from.y))
        .attr('x2', segment => x(segment.to.x))
        .attr('y2', segment => y(segment.to.y))
      vertexDots
        .get(group)
        ?.data(segments, segment => segment.department)
        .transition('geometry')
        .duration(duration)
        .ease(d3.easeCubicInOut)
        .attr('cx', segment => x(segment.to.x))
        .attr('cy', segment => y(segment.to.y))
      letters
        .get(group)
        ?.data(segments, segment => segment.department)
        .transition('geometry')
        .duration(duration)
        .ease(d3.easeCubicInOut)
        .attr('x', segment => labelPosition(screen(segment.from), screen(segment.to), side)[0])
        .attr('y', segment => labelPosition(screen(segment.from), screen(segment.to), side)[1])
        .attr('opacity', segment => labelOpacity(segment, state))
      hits
        .get(group)
        ?.data(segments, segment => segment.department)
        .attr('x1', segment => x(segment.from.x))
        .attr('y1', segment => y(segment.from.y))
        .attr('x2', segment => x(segment.to.x))
        .attr('y2', segment => y(segment.to.y))
    }

    chords
      .transition('geometry')
      .duration(duration)
      .ease(d3.easeCubicInOut)
      .attr('x2', group => x(pathEnd(group, state.t).x))
      .attr('y2', group => y(pathEnd(group, state.t).y))
    ends
      .transition('geometry')
      .duration(duration)
      .attr('x', group => x(pathEnd(group, state.t).x))
      .attr('y', group => y(pathEnd(group, state.t).y))
  }

  const drawFocus = (state: ChartState, duration: number): void => {
    for (const group of GROUPS) {
      segmentLines
        .get(group)
        ?.transition('focus')
        .duration(duration)
        .attr('stroke-width', segment => (segment.department === state.focus ? 3.5 : 2))
        .attr('stroke-opacity', segment =>
          state.focus === null || segment.department === state.focus ? 1 : 0.25
        )
    }

    // The rays lay the two vectors of the department side by side at the
    // origin, where their slopes compare directly with the chords.
    const department = departments.find(candidate => candidate.department === state.focus)
    const rays: Ray[] =
      department === undefined
        ? []
        : GROUPS.map(group => ({ group, end: rayEnd(departmentRate(group, department), corner) }))

    rayLayer
      .selectAll<SVGLineElement, Ray>('line')
      .data(rays, ray => ray.group)
      .join(
        enter =>
          enter
            .append('line')
            .attr('x1', x(0))
            .attr('y1', y(0))
            .attr('x2', x(0))
            .attr('y2', y(0))
            .attr('stroke-width', 1.5)
            .attr('stroke-dasharray', ray => DASH[ray.group]),
        update => update,
        exit => exit.transition('focus').duration(duration).attr('stroke-opacity', 0).remove()
      )
      .transition('focus')
      .duration(duration)
      .ease(d3.easeCubicOut)
      .attr('stroke-opacity', 0.8)
      .attr('x2', ray => x(ray.end.x))
      .attr('y2', ray => y(ray.end.y))
  }

  const drawWeight = (state: ChartState): void => {
    const value = riskDifference(state.t)
    const nearRightEdge = state.t > 0.85

    guide.attr('x1', t(state.t)).attr('x2', t(state.t)).attr('y1', rd(value))
    marker.attr('cx', t(state.t)).attr('cy', rd(value))
    markerValue
      .attr('x', t(state.t))
      .attr('text-anchor', nearRightEdge ? 'end' : 'start')
      .attr('dx', nearRightEdge ? -8 : 8)
      .attr('y', rd(value))
      .text(formatValue(value))
  }

  // Any interaction cuts the drawing of the paths short: the pending steps are
  // dropped and every element takes its final appearance.
  const finishReveal = (): void => {
    if (!revealing) return

    revealing = false
    content.selectAll('*').interrupt('reveal')
    for (const group of GROUPS) {
      segmentLines.get(group)?.attr('visibility', null)
      vertexDots.get(group)?.attr('opacity', null)
    }
    ends.attr('opacity', null)
  }

  const update = (state: ChartState): void => {
    finishReveal()
    const previous = current
    current = state
    const animate = motion && previous !== null

    drawPaths(state, animate && previous.mode !== state.mode ? MORPH_MS : 0)
    drawFocus(state, animate && previous.focus !== state.focus ? FOCUS_MS : 0)
    drawWeight(state)
  }

  const reveal = (): void => {
    content.attr('opacity', 1)
    const state = current
    if (!motion || state === null) {
      return
    }

    revealing = true

    // Each vector grows from its tail once the previous one is in place, so
    // the paths are built the way they are defined. A vector waiting its turn
    // has no length, and is hidden until then because its round cap would
    // still draw a dot.
    for (const group of GROUPS) {
      const lines = segmentLines.get(group)
      lines
        ?.attr('visibility', 'hidden')
        .transition('reveal')
        .delay((_segment, index) => index * REVEAL_STEP_MS)
        .duration(0)
        .attr('visibility', 'visible')
      lines
        ?.attr('x2', segment => x(segment.from.x))
        .attr('y2', segment => y(segment.from.y))
        .transition('geometry')
        .delay((_segment, index) => index * REVEAL_STEP_MS)
        .duration(REVEAL_STEP_MS)
        .ease(d3.easeCubicOut)
        .attr('x2', segment => x(segment.to.x))
        .attr('y2', segment => y(segment.to.y))
      vertexDots
        .get(group)
        ?.attr('opacity', 0)
        .transition('reveal')
        .delay((_segment, index) => (index + 1) * REVEAL_STEP_MS)
        .attr('opacity', 1)
      letters
        .get(group)
        ?.attr('opacity', 0)
        .transition('reveal')
        .delay((_segment, index) => (index + 0.5) * REVEAL_STEP_MS)
        .duration(REVEAL_STEP_MS)
        .attr('opacity', segment => labelOpacity(segment, state))
    }

    const built = departments.length * REVEAL_STEP_MS
    chords
      .attr('x2', x(0))
      .attr('y2', y(0))
      .transition('geometry')
      .delay(built)
      .duration(2 * REVEAL_STEP_MS)
      .ease(d3.easeCubicInOut)
      .attr('x2', group => x(pathEnd(group, state.t).x))
      .attr('y2', group => y(pathEnd(group, state.t).y))
    ends
      .attr('opacity', 0)
      .transition('reveal')
      .delay(built + 2 * REVEAL_STEP_MS)
      .duration(REVEAL_STEP_MS)
      .attr('opacity', 1)
      .on('end', () => {
        revealing = false
      })
  }

  const destroy = (): void => {
    svg.selectAll('*').interrupt('geometry').interrupt('focus').interrupt('reveal')
    svg.selectAll('*').remove()
  }

  return { update, reveal, destroy }
}
