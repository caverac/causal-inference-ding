import { CHART_FONT_FAMILY, CHART_FONT_SIZE, styleAxis } from '@site/src/components/chartStyle'
import {
  CONTOUR_LEVELS,
  LABEL_SIDE,
  PLANE,
  contour,
  contourLabelPoints,
  correlation,
  covariates,
  groups,
  planePoint,
  variableIndex,
  variables,
  type Covariate,
  type PlanePoint
} from '@site/src/components/correlationMap/model'
import { nearestIndex, placeOnCurve, type Box } from '@site/src/components/correlationMap/placement'
import { appendMathText } from '@site/src/components/math/formula'
import * as d3 from 'd3'

/** The variables in focus, by index in `variables`: a pair for a cell of the matrix, one for a covariate. */
export interface CorrelationFocus {
  readonly variables: readonly number[]
}

export interface CorrelationChart {
  readonly update: (focus: CorrelationFocus | null) => void
  readonly destroy: () => void
}

const MARGIN = { top: 20, right: 16, bottom: 44, left: 64 } as const
/** Room right of the diagonal of the matrix for the names of the variables. */
const LABEL_SPACE = 72
/** Space between the groups of variables in the matrix. */
const GROUP_GAP = 6
const MIN_CELL = 16
const MAX_CELL = 38
const PANEL_GAP = 52
const PLANE_ASPECT = 0.62
const MIN_PLANE_HEIGHT = 220
const MAX_PLANE_HEIGHT = 420
const POINT_RADIUS = 4.5
/** Opacity of what is out of focus. */
const FADED = 0.18
/** Ink of the tiles under the circles of the matrix. */
const TILE_OPACITY = 0.04

const formatLevel = d3.format('+,')
/** Narrowest plane on which the contours of negative change, which pass no covariate, keep their labels. */
const NEGATIVE_LABELS_MIN_WIDTH = 520
/** Ink of the quadrants where adding a covariate raises the coefficient. */
const QUADRANT_OPACITY = 0.035

interface Cell {
  readonly row: number
  readonly column: number
  readonly value: number
}

/** The cells below the diagonal: every pair of variables once. */
const CELLS: readonly Cell[] = variables.flatMap((_row, row) =>
  d3.range(row).map(column => ({ row, column, value: correlation(row, column) }))
)

function inFocus(focus: CorrelationFocus | null, ...indices: number[]): boolean {
  return focus === null || indices.some(index => focus.variables.includes(index))
}

/**
 * Draws the correlations of the LaLonde data in two panels. a: the matrix of
 * sample correlations, each a circle whose area is the absolute correlation,
 * filled when positive and open when negative. b: the covariates in the plane
 * of their correlation with the treatment and their partial correlation with
 * the outcome given the treatment, over the contours of the change that adding
 * each one alone makes to the coefficient of the treatment.
 */
export function createCorrelationChart(
  svgElement: SVGSVGElement,
  width: number,
  onFocus: (focus: CorrelationFocus | null) => void
): CorrelationChart {
  const plotWidth = Math.max(width - MARGIN.left - MARGIN.right, 1)
  const cell = Math.min(
    MAX_CELL,
    Math.max(MIN_CELL, (plotWidth - LABEL_SPACE - 2 * GROUP_GAP) / variables.length)
  )
  /** Left or top edge of the row or column of a variable, with a gap before each new group. */
  const offset = (index: number): number =>
    index * cell +
    GROUP_GAP * d3.range(1, index + 1).filter(k => groups[k] !== groups[k - 1]).length
  const matrixSize = offset(variables.length - 1) + cell
  const planeTop = matrixSize + PANEL_GAP
  const planeHeight = Math.min(
    MAX_PLANE_HEIGHT,
    Math.max(MIN_PLANE_HEIGHT, plotWidth * PLANE_ASPECT)
  )
  const height = MARGIN.top + planeTop + planeHeight + MARGIN.bottom

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

  const panelLetter = (letter: string, top: number): void => {
    root
      .append('text')
      .attr('x', -MARGIN.left + 4)
      .attr('y', top)
      .attr('dominant-baseline', 'hanging')
      .attr('font-weight', 'bold')
      .text(letter)
  }

  // ---------------------------------------------------------------------------
  // a: the matrix of correlations
  // ---------------------------------------------------------------------------

  panelLetter('a', 0)
  const matrix = root.append('g')
  const maxRadius = cell / 2 - 2
  const radius = (value: number): number => maxRadius * Math.sqrt(Math.abs(value))

  const tiles = matrix
    .append('g')
    .selectAll<SVGRectElement, Cell>('rect')
    .data(CELLS)
    .join('rect')
    .attr('x', item => offset(item.column))
    .attr('y', item => offset(item.row))
    .attr('width', cell - 1)
    .attr('height', cell - 1)
    .attr('fill', 'currentColor')
    .attr('fill-opacity', TILE_OPACITY)
    .on('pointerenter', (_event: PointerEvent, item) => {
      onFocus({ variables: [item.row, item.column] })
    })
    .on('pointerleave', () => {
      onFocus(null)
    })
  const circles = matrix
    .append('g')
    .attr('pointer-events', 'none')
    .attr('stroke', 'currentColor')
    .selectAll<SVGCircleElement, Cell>('circle')
    .data(CELLS)
    .join('circle')
    .attr('cx', item => offset(item.column) + (cell - 1) / 2)
    .attr('cy', item => offset(item.row) + (cell - 1) / 2)
    .attr('r', item => radius(item.value))
    .attr('fill', item => (item.value > 0 ? 'currentColor' : 'none'))
    .attr('stroke-width', item => (item.value > 0 ? 0 : 1))

  // The names sit on the diagonal and run into the empty upper triangle.
  const names = matrix
    .append('g')
    .attr('dominant-baseline', 'central')
    .selectAll<SVGTextElement, string>('text')
    .data(variables)
    .join('text')
    .attr('x', (_name, index) => offset(index) + 3)
    .attr('y', (_name, index) => offset(index) + (cell - 1) / 2)
    .text(name => name)

  // Legend for the areas, in the empty top right corner of the triangle: the
  // positive correlations above, each negative one under its opposite.
  const legendMagnitudes = [0.25, 0.5, 1]
  const legendItems = [1, -1].flatMap((sign, row) =>
    legendMagnitudes.map((magnitude, column) => ({ value: sign * magnitude, row, column }))
  )
  // Wide enough for the longest value, -0.25, at the one font size of the chart.
  const legendStep = Math.max(cell, 42)
  const legendRowHeight = 2 * maxRadius + 22
  const legendWidth = legendStep * legendMagnitudes.length
  const legendBottom = maxRadius + 2 + legendRowHeight + maxRadius + 20
  // Right-aligned with the matrix, unless that would touch the names of the
  // variables beside it, as it does when the cells are small.
  const clearOfNames =
    d3.max(names.nodes(), node => {
      const box = node.getBBox()
      return box.y < legendBottom ? box.x + box.width + 12 : 0
    }) ?? 0
  const legendLeft =
    Math.min(plotWidth - legendWidth, Math.max(matrixSize - legendWidth, clearOfNames)) +
    legendStep / 2
  const legend = matrix.append('g').attr('transform', `translate(${legendLeft},${maxRadius + 2})`)
  legend
    .selectAll('circle')
    .data(legendItems)
    .join('circle')
    .attr('cx', item => item.column * legendStep)
    .attr('cy', item => item.row * legendRowHeight)
    .attr('r', item => radius(item.value))
    .attr('fill', item => (item.value > 0 ? 'currentColor' : 'none'))
    .attr('stroke', 'currentColor')
    .attr('stroke-width', item => (item.value > 0 ? 0 : 1))
  legend
    .selectAll('text')
    .data(legendItems)
    .join('text')
    .attr('x', item => item.column * legendStep)
    .attr('y', item => item.row * legendRowHeight + maxRadius + 12)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .text(item => d3.format('~g')(item.value))

  // ---------------------------------------------------------------------------
  // b: the covariates in the plane of the change of the coefficient
  // ---------------------------------------------------------------------------

  panelLetter('b', planeTop)
  const plane = root.append('g').attr('transform', `translate(0,${planeTop})`)
  const x = d3.scaleLinear().domain([-PLANE.x, PLANE.x]).range([0, plotWidth])
  const y = d3.scaleLinear().domain([-PLANE.y, PLANE.y]).range([planeHeight, 0])
  const screen = (point: PlanePoint): [number, number] => [x(point.x), y(point.y)]

  styleAxis(
    plane
      .append('g')
      .attr('transform', `translate(0,${planeHeight})`)
      .call(
        d3
          .axisBottom(x)
          .tickValues(d3.range(-3, 4).map(k => k / 10))
          .tickFormat(d3.format('.1f'))
      )
  )
  styleAxis(
    plane.append('g').call(
      d3
        .axisLeft(y)
        .tickValues(d3.range(-2, 3).map(k => (k * 4) / 10))
        .tickFormat(d3.format('.1f'))
    )
  )
  appendMathText(
    plane
      .append('text')
      .attr('x', plotWidth / 2)
      .attr('y', planeHeight + 38)
      .attr('text-anchor', 'middle'),
    '\\rho_{ZX}'
  )
  appendMathText(
    plane
      .append('text')
      .attr('transform', `translate(${-MARGIN.left + 18},${planeHeight / 2}) rotate(-90)`)
      .attr('text-anchor', 'middle'),
    '\\rho_{YX|Z}'
  )

  // The quadrants where the two correlations have opposite signs, so that
  // adding the covariate raises the coefficient, are tinted.
  plane
    .append('g')
    .attr('fill', 'currentColor')
    .attr('fill-opacity', QUADRANT_OPACITY)
    .selectAll('rect')
    .data([
      { left: 0, top: 0 },
      { left: x(0), top: y(0) }
    ])
    .join('rect')
    .attr('x', quadrant => quadrant.left)
    .attr('y', quadrant => quadrant.top)
    .attr('width', x(0))
    .attr('height', y(0))
  const corners = plane.append('g')
  const cornerInset = 8
  const quadrantMarks = [
    { sign: '>', x: cornerInset, y: cornerInset, anchor: 'start', baseline: 'hanging' },
    { sign: '<', x: plotWidth - cornerInset, y: cornerInset, anchor: 'end', baseline: 'hanging' },
    { sign: '<', x: cornerInset, y: planeHeight - cornerInset, anchor: 'start', baseline: 'auto' },
    {
      sign: '>',
      x: plotWidth - cornerInset,
      y: planeHeight - cornerInset,
      anchor: 'end',
      baseline: 'auto'
    }
  ] as const
  for (const mark of quadrantMarks) {
    appendMathText(
      corners
        .append('text')
        .attr('x', mark.x)
        .attr('y', mark.y)
        .attr('text-anchor', mark.anchor)
        .attr('dominant-baseline', mark.baseline),
      `\\Delta\\beta ${mark.sign} 0`
    )
  }

  const zeroLines = plane.append('g').attr('stroke', 'currentColor').attr('stroke-opacity', 0.4)
  zeroLines.append('line').attr('x1', x(0)).attr('x2', x(0)).attr('y1', 0).attr('y2', planeHeight)
  zeroLines.append('line').attr('x1', 0).attr('x2', plotWidth).attr('y1', y(0)).attr('y2', y(0))

  const line = d3.line<PlanePoint>(
    point => x(point.x),
    point => y(point.y)
  )
  plane
    .append('g')
    .attr('fill', 'none')
    .attr('stroke', 'currentColor')
    .attr('stroke-dasharray', '1 3')
    .attr('stroke-opacity', 0.75)
    .selectAll('path')
    .data(CONTOUR_LEVELS.flatMap(level => contour(level)))
    .join('path')
    .attr('d', branch => line(branch))
  // Filled once the covariates and their names are drawn, which the labels
  // of the contours must clear.
  const contourLabelLayer = plane
    .append('g')
    .attr('class', 'explorer__halo')
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')

  const points = plane
    .append('g')
    .attr('stroke', 'currentColor')
    .attr('stroke-width', 1.25)
    .selectAll<SVGCircleElement, Covariate>('circle')
    .data(covariates)
    .join('circle')
    .attr('cx', covariate => screen(planePoint(covariate))[0])
    .attr('cy', covariate => screen(planePoint(covariate))[1])
    .attr('r', POINT_RADIUS)
    .attr('fill', covariate => (covariate.group === 'earnings' ? 'currentColor' : 'none'))

  const labelOffset = POINT_RADIUS + 5
  const pointLabels = plane
    .append('g')
    .attr('class', 'explorer__halo')
    .attr('dominant-baseline', 'central')
    .selectAll<SVGTextElement, Covariate>('text')
    .data(covariates)
    .join('text')
    .each((covariate, index, nodes) => {
      const node = nodes[index]
      if (node === undefined) return
      const [px, py] = screen(planePoint(covariate))
      const side = LABEL_SIDE[covariate.name] ?? 'right'
      const placement = {
        left: { x: px - labelOffset, y: py, anchor: 'end' },
        right: { x: px + labelOffset, y: py, anchor: 'start' },
        above: { x: px, y: py - labelOffset - 2, anchor: 'middle' },
        below: { x: px, y: py + labelOffset + 2, anchor: 'middle' }
      }[side]
      d3.select(node)
        .attr('x', placement.x)
        .attr('y', placement.y)
        .attr('text-anchor', placement.anchor)
    })
    .text(covariate => covariate.name)

  // Each contour is labeled on its own curve, as near to the diagonal of its
  // quadrant as it can be while clearing the covariates, their names and the
  // labels placed before it.
  const obstacles: Box[] = covariates.map(covariate => {
    const [px, py] = screen(planePoint(covariate))
    return { x: px, y: py, width: 2 * POINT_RADIUS + 4, height: 2 * POINT_RADIUS + 4 }
  })
  pointLabels.each((_covariate, index, nodes) => {
    const box = nodes[index]?.getBBox()
    if (box !== undefined) {
      obstacles.push({
        x: box.x + box.width / 2,
        y: box.y + box.height / 2,
        width: box.width + 4,
        height: box.height
      })
    }
  })
  corners.selectAll<SVGTextElement, unknown>('text').each((_datum, index, nodes) => {
    const box = nodes[index]?.getBBox()
    if (box !== undefined) {
      obstacles.push({
        x: box.x + box.width / 2,
        y: box.y + box.height / 2,
        width: box.width + 4,
        height: box.height + 4
      })
    }
  })
  const labeledLevels = CONTOUR_LEVELS.filter(
    level => level > 0 || plotWidth >= NEGATIVE_LABELS_MIN_WIDTH
  )
  for (const level of labeledLevels) {
    const targets = contourLabelPoints(level)
    contour(level).forEach((branch, side) => {
      const target = targets[side]
      if (target === undefined) return
      const candidates = branch.map(screen)
      const label = contourLabelLayer.append('text').text(formatLevel(level))
      const measured = label.node()?.getBBox()
      const size = { width: (measured?.width ?? 0) + 4, height: measured?.height ?? 0 }
      const placed = placeOnCurve(
        candidates,
        nearestIndex(candidates, screen(target)),
        size,
        obstacles,
        [plotWidth, planeHeight]
      )
      if (placed === null) {
        label.remove()
        return
      }
      label.attr('x', placed.x).attr('y', placed.y)
      obstacles.push(placed)
    })
  }

  // Larger invisible targets over the points, reachable by keyboard too.
  plane
    .append('g')
    .selectAll<SVGCircleElement, Covariate>('circle')
    .data(covariates)
    .join('circle')
    .attr('class', 'explorer__hit')
    .attr('cx', covariate => screen(planePoint(covariate))[0])
    .attr('cy', covariate => screen(planePoint(covariate))[1])
    .attr('r', 12)
    .attr('fill', 'transparent')
    .attr('tabindex', 0)
    .attr('role', 'button')
    .attr('aria-label', covariate => `Covariate ${covariate.name}`)
    .on('pointerenter focus', (_event: Event, covariate) => {
      onFocus({ variables: [variableIndex(covariate.name)] })
    })
    .on('pointerleave blur', () => {
      onFocus(null)
    })

  // ---------------------------------------------------------------------------
  // Updates
  // ---------------------------------------------------------------------------

  const update = (focus: CorrelationFocus | null): void => {
    tiles.attr('fill-opacity', item =>
      focus !== null && inFocus(focus, item.row, item.column) ? TILE_OPACITY * 3 : TILE_OPACITY
    )
    circles.attr('opacity', item => (inFocus(focus, item.row, item.column) ? 1 : FADED))
    names.attr('font-weight', (_name, index) =>
      focus?.variables.includes(index) === true ? 'bold' : null
    )

    // The plane brings forward the covariates in focus, if the focus has any.
    const focusedCovariates =
      focus === null
        ? []
        : covariates.filter(covariate => focus.variables.includes(variableIndex(covariate.name)))
    const planeOpacity = (covariate: Covariate): number =>
      focusedCovariates.length === 0 || focusedCovariates.includes(covariate) ? 1 : FADED
    points.attr('opacity', planeOpacity)
    pointLabels.attr('opacity', planeOpacity)
  }

  const destroy = (): void => {
    svg.selectAll('*').remove()
  }

  return { update, destroy }
}
