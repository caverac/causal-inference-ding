import { CHART_FONT_FAMILY, CHART_FONT_SIZE, styleAxis } from '@site/src/components/chartStyle'
import { COUNT_DOMAIN, countTicks } from '@site/src/components/fisherExact/dealChart'
import { isExtreme, nullDistribution, type NullRow } from '@site/src/components/fisherExact/model'
import { appendMathText } from '@site/src/components/math/formula'
import * as d3 from 'd3'

export interface NullChart {
  /** Redraws the chart for a chosen count x. */
  readonly update: (k: number) => void
  readonly destroy: () => void
}

const MARGIN = { top: 12, right: 16, bottom: 44, left: 72 } as const
const PANEL_HEIGHT = 150
const PANEL_GAP = 20

/**
 * Draws the null distribution of X on a linear scale, over the same
 * probabilities on a log scale, where the tails become visible. The counts at
 * least as extreme as the chosen one are drawn in full ink: those on or below
 * the dashed line of the lower panel, whose probabilities add up to the
 * two-sided p-value.
 */
export function createNullChart(
  svgElement: SVGSVGElement,
  width: number,
  onSelect: (k: number) => void
): NullChart {
  const plotWidth = Math.max(width - MARGIN.left - MARGIN.right, 1)
  const lowerTop = PANEL_HEIGHT + PANEL_GAP
  const height = MARGIN.top + 2 * PANEL_HEIGHT + PANEL_GAP + MARGIN.bottom

  const [low, high] = COUNT_DOMAIN
  const rows: NullRow[] = nullDistribution.filter(row => row.k >= low && row.k <= high)
  const probabilityByCount = new Map(rows.map(row => [row.k, row]))

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

  const x = d3
    .scaleLinear()
    .domain([low - 0.5, high + 0.5])
    .range([0, plotWidth])
  const barWidth = Math.max(1, x(1) - x(0) - 1)
  const linear = d3
    .scaleLinear()
    .domain([0, d3.max(rows, row => row.probability) ?? 1])
    .nice()
    .range([PANEL_HEIGHT, 0])
  const logs = rows.map(row => row.log10_probability)
  const logarithmic = d3
    .scaleLinear()
    .domain([Math.min(...logs), Math.max(...logs)])
    .nice()
    .range([PANEL_HEIGHT, 0])

  const upper = root.append('g')
  const lower = root.append('g').attr('transform', `translate(0,${lowerTop})`)
  const tickValues = countTicks(plotWidth)

  styleAxis(
    upper
      .append('g')
      .attr('transform', `translate(0,${PANEL_HEIGHT})`)
      .call(
        d3
          .axisBottom(x)
          .tickValues(tickValues)
          .tickFormat(() => '')
      )
  )
  styleAxis(upper.append('g').call(d3.axisLeft(linear).ticks(4).tickFormat(d3.format('.2f'))))
  styleAxis(
    lower
      .append('g')
      .attr('transform', `translate(0,${PANEL_HEIGHT})`)
      .call(d3.axisBottom(x).tickValues(tickValues).tickFormat(d3.format('d')))
  )
  styleAxis(lower.append('g').call(d3.axisLeft(logarithmic).ticks(5).tickFormat(d3.format('d'))))

  for (const [panel, label] of [
    [upper, 'pr(X = x)'],
    [lower, 'log_{10} pr(X = x)']
  ] as const) {
    appendMathText(
      panel
        .append('text')
        .attr('transform', `translate(${-MARGIN.left + 16},${PANEL_HEIGHT / 2}) rotate(-90)`)
        .attr('text-anchor', 'middle'),
      label
    )
  }
  appendMathText(
    lower
      .append('text')
      .attr('x', plotWidth / 2)
      .attr('y', PANEL_HEIGHT + 38)
      .attr('text-anchor', 'middle'),
    'x'
  )

  const bars = upper
    .append('g')
    .selectAll<SVGRectElement, NullRow>('rect')
    .data(rows)
    .join('rect')
    .attr('x', row => x(row.k) - barWidth / 2)
    .attr('width', barWidth)
    .attr('y', row => linear(row.probability))
    .attr('height', row => PANEL_HEIGHT - linear(row.probability))

  lower
    .append('path')
    .attr('fill', 'none')
    .attr('stroke', 'currentColor')
    .attr('stroke-opacity', 0.4)
    .attr(
      'd',
      d3.line<NullRow>(
        row => x(row.k),
        row => logarithmic(row.log10_probability)
      )(rows)
    )
  const points = lower
    .append('g')
    .selectAll<SVGCircleElement, NullRow>('circle')
    .data(rows)
    .join('circle')
    .attr('cx', row => x(row.k))
    .attr('cy', row => logarithmic(row.log10_probability))
    .attr('r', 2.5)
    .attr('stroke', 'currentColor')

  const threshold = lower
    .append('line')
    .attr('x1', 0)
    .attr('x2', plotWidth)
    .attr('stroke', 'currentColor')
    .attr('stroke-dasharray', '5 4')
  const guides = [upper, lower].map(panel =>
    panel.append('line').attr('y1', 0).attr('y2', PANEL_HEIGHT).attr('stroke', 'currentColor')
  )

  // Both panels act as a slider: pressing anywhere chooses a count, and
  // dragging moves it.
  const dragArea = root
    .append('rect')
    .attr('class', 'explorer__drag')
    .attr('width', plotWidth)
    .attr('height', 2 * PANEL_HEIGHT + PANEL_GAP)
    .attr('fill', 'transparent')
  const select = (event: PointerEvent): void => {
    const k = Math.round(x.invert(d3.pointer(event, root.node())[0]))
    onSelect(Math.min(high, Math.max(low, k)))
  }
  dragArea
    .on('pointerdown', (event: PointerEvent) => {
      dragArea.node()?.setPointerCapture(event.pointerId)
      select(event)
    })
    .on('pointermove', (event: PointerEvent) => {
      if (dragArea.node()?.hasPointerCapture(event.pointerId) === true) {
        select(event)
      }
    })

  const update = (k: number): void => {
    bars.attr('fill-opacity', row => (isExtreme(row.k, k) ? 1 : 0.25))
    points.attr('fill', row => (isExtreme(row.k, k) ? 'currentColor' : 'none'))

    const chosen = probabilityByCount.get(k)
    const level = chosen === undefined ? 0 : logarithmic(chosen.log10_probability)
    threshold.attr('y1', level).attr('y2', level)
    for (const guide of guides) {
      guide.attr('x1', x(k)).attr('x2', x(k))
    }
  }

  const destroy = (): void => {
    svg.selectAll('*').remove()
  }

  return { update, destroy }
}
