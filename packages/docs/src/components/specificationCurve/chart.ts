import { CHART_FONT_FAMILY, CHART_FONT_SIZE, styleAxis } from '@site/src/components/chartStyle'
import { appendMathText } from '@site/src/components/math/formula'
import {
  bookRanks,
  covariates,
  includes,
  isSignificant,
  specifications,
  type Specification
} from '@site/src/components/specificationCurve/model'
import * as d3 from 'd3'

export interface CurveState {
  /** Rank of the specification under the pointer, if any. */
  readonly hovered: number | null
  /** Index in `covariates` of the covariate whose regressions are brought forward, if any. */
  readonly selected: number | null
}

export interface CurveChart {
  readonly update: (state: CurveState) => void
  readonly destroy: () => void
}

const MARGIN = { top: 12, right: 16, bottom: 36, left: 84 } as const
const CURVE_HEIGHT = 240
const PANEL_GAP = 14
const ROW_HEIGHT = 15
/** Height of a mark within its row. */
const MARK_HEIGHT = 10
/** Space between the significance strip and the rows of the covariates. */
const STRIP_GAP = 8
/** Opacity of the specifications left out of a selection. */
const FADED = 0.12
/** Ink of the intervals, which overlap by the hundred. */
const INTERVAL_OPACITY = 0.25

/** A row of marks under the curve: one mark per regression that `has` the row's property. */
interface MarkRow {
  readonly label: string
  /** Whether the label is a formula, set in the style of the chart's math. */
  readonly math: boolean
  readonly top: number
  readonly has: (specification: Specification) => boolean
}

/** The significance strip, then one row per covariate. */
const MARK_ROWS: readonly MarkRow[] = [
  { label: 'p < 0.05', math: true, top: 0, has: isSignificant },
  ...covariates.map((name, index) => ({
    label: name,
    math: false,
    top: ROW_HEIGHT + STRIP_GAP + index * ROW_HEIGHT,
    has: (specification: Specification) => includes(specification, index)
  }))
]

/**
 * Draws the specification curve of Simonsohn et al. (2020): the estimated
 * coefficient of `treat` in each regression, by increasing value, with its
 * interval (top), over a strip marking the significant coefficients and the
 * covariates each regression includes (bottom). The two panels share the rank
 * of the regression along the horizontal axis.
 */
export function createCurveChart(
  svgElement: SVGSVGElement,
  width: number,
  onHover: (rank: number | null) => void
): CurveChart {
  const plotWidth = Math.max(width - MARGIN.left - MARGIN.right, 1)
  const matrixTop = CURVE_HEIGHT + PANEL_GAP
  const matrixHeight = ROW_HEIGHT + STRIP_GAP + covariates.length * ROW_HEIGHT
  const height = MARGIN.top + matrixTop + matrixHeight + MARGIN.bottom

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

  const last = specifications.length - 1
  const x = d3
    .scaleLinear()
    .domain([-0.5, last + 0.5])
    .range([0, plotWidth])
  const step = x(1) - x(0)
  const y = d3
    .scaleLinear()
    .domain([
      d3.min(specifications, specification => specification.conf_low) ?? 0,
      d3.max(specifications, specification => specification.conf_high) ?? 0
    ])
    .nice()
    .range([CURVE_HEIGHT, 0])

  // ---------------------------------------------------------------------------
  // The curve: estimates and their intervals
  // ---------------------------------------------------------------------------

  const curve = root.append('g')
  styleAxis(
    curve
      .append('g')
      .attr('transform', `translate(0,${CURVE_HEIGHT})`)
      .call(d3.axisBottom(x).tickValues([]).tickSizeOuter(0))
  )
  styleAxis(curve.append('g').call(d3.axisLeft(y).ticks(6).tickFormat(d3.format(',.0f'))))
  appendMathText(
    curve
      .append('text')
      .attr('transform', `translate(${-MARGIN.left + 16},${CURVE_HEIGHT / 2}) rotate(-90)`)
      .attr('text-anchor', 'middle'),
    '\u03b2 (USD)'
  )
  curve
    .append('line')
    .attr('x1', 0)
    .attr('x2', plotWidth)
    .attr('y1', y(0))
    .attr('y2', y(0))
    .attr('stroke', 'currentColor')
    .attr('stroke-dasharray', '5 4')

  const intervals = curve
    .append('g')
    .attr('stroke', 'currentColor')
    .selectAll<SVGLineElement, Specification>('line')
    .data(specifications)
    .join('line')
    .attr('x1', (_specification, rank) => x(rank))
    .attr('x2', (_specification, rank) => x(rank))
    .attr('y1', specification => y(specification.conf_low))
    .attr('y2', specification => y(specification.conf_high))
  const points = curve
    .append('g')
    .attr('stroke', 'currentColor')
    .attr('stroke-width', 0.75)
    .selectAll<SVGCircleElement, Specification>('circle')
    .data(specifications)
    .join('circle')
    .attr('cx', (_specification, rank) => x(rank))
    .attr('cy', specification => y(specification.estimate))
    .attr('r', 1.75)

  // Rings around the two regressions of Section 1.2.1 of the book.
  const ranks = bookRanks()
  curve
    .append('g')
    .attr('fill', 'none')
    .attr('stroke', 'currentColor')
    .selectAll('circle')
    .data([ranks.none, ranks.all])
    .join('circle')
    .attr('cx', rank => x(rank))
    .attr('cy', rank => y(specifications[rank]?.estimate ?? 0))
    .attr('r', 6)

  // ---------------------------------------------------------------------------
  // The significance and the covariates of each regression
  // ---------------------------------------------------------------------------

  const matrix = root.append('g').attr('transform', `translate(0,${matrixTop})`)
  styleAxis(
    matrix
      .append('g')
      .attr('transform', `translate(0,${matrixHeight})`)
      .call(
        d3
          .axisBottom(x)
          .tickValues([0, 255, 511, 767, last])
          .tickFormat(rank => d3.format('d')(Number(rank) + 1))
      )
  )
  const labels = matrix.append('g').attr('text-anchor', 'end').attr('dominant-baseline', 'central')
  for (const markRow of MARK_ROWS) {
    const label = labels
      .append('text')
      .attr('x', -8)
      .attr('y', markRow.top + ROW_HEIGHT / 2)
    if (markRow.math) {
      appendMathText(label, markRow.label)
    } else {
      label.text(markRow.label)
    }
  }

  // Each row is a single path of marks, as the marks run into the thousands.
  const markWidth = Math.max(step, 1)
  const markTop = (ROW_HEIGHT - MARK_HEIGHT) / 2
  const rowPath = (markRow: MarkRow, selected: (rank: number) => boolean): string =>
    specifications
      .map((specification, rank) =>
        markRow.has(specification) && selected(rank)
          ? `M${x(rank) - markWidth / 2},${markRow.top + markTop}h${markWidth}v${MARK_HEIGHT}h${-markWidth}Z`
          : ''
      )
      .join('')
  const rows = matrix.append('g').attr('stroke', 'none')
  const fullRows = rows
    .selectAll<SVGPathElement, MarkRow>('path.full')
    .data(MARK_ROWS)
    .join('path')
    .attr('class', 'full')
  const fadedRows = rows
    .selectAll<SVGPathElement, MarkRow>('path.faded')
    .data(MARK_ROWS)
    .join('path')
    .attr('class', 'faded')
    .attr('opacity', FADED)

  // ---------------------------------------------------------------------------
  // Hovering a regression
  // ---------------------------------------------------------------------------

  const guide = root
    .append('line')
    .attr('y1', 0)
    .attr('y2', matrixTop + matrixHeight)
    .attr('stroke', 'currentColor')
    .attr('stroke-dasharray', '1 3')
  const focus = curve
    .append('circle')
    .attr('r', 4)
    .attr('fill', 'currentColor')
    .attr('stroke', 'currentColor')
  const hoverArea = root
    .append('rect')
    .attr('width', plotWidth)
    .attr('height', matrixTop + matrixHeight)
    .attr('fill', 'transparent')
  const rankAt = (event: PointerEvent): number => {
    const rank = Math.round(x.invert(d3.pointer(event, root.node())[0]))
    return Math.min(last, Math.max(0, rank))
  }
  hoverArea
    .on('pointermove pointerdown', (event: PointerEvent) => {
      onHover(rankAt(event))
    })
    .on('pointerleave', () => {
      onHover(null)
    })

  // ---------------------------------------------------------------------------
  // Updates
  // ---------------------------------------------------------------------------

  const update = ({ hovered, selected }: CurveState): void => {
    const inSelection = (rank: number): boolean => {
      const specification = specifications[rank]
      return selected === null || (specification !== undefined && includes(specification, selected))
    }

    intervals.attr('stroke-opacity', (_specification, rank) =>
      inSelection(rank) ? INTERVAL_OPACITY : INTERVAL_OPACITY * FADED
    )
    points.attr('opacity', (_specification, rank) => (inSelection(rank) ? 1 : FADED))
    fullRows.attr('d', markRow => rowPath(markRow, inSelection))
    fadedRows.attr('d', markRow =>
      selected === null ? '' : rowPath(markRow, rank => !inSelection(rank))
    )

    const specification = hovered === null ? undefined : specifications[hovered]
    if (hovered === null || specification === undefined) {
      guide.attr('visibility', 'hidden')
      focus.attr('visibility', 'hidden')
      return
    }
    guide.attr('visibility', 'visible').attr('x1', x(hovered)).attr('x2', x(hovered))
    focus.attr('visibility', 'visible').attr('cx', x(hovered)).attr('cy', y(specification.estimate))
  }

  const destroy = (): void => {
    svg.selectAll('*').remove()
  }

  return { update, destroy }
}
