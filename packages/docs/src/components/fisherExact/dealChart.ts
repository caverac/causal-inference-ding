import { CHART_FONT_FAMILY, CHART_FONT_SIZE, styleAxis } from '@site/src/components/chartStyle'
import {
  callbacks,
  expected,
  isExtreme,
  probabilityOf,
  resumes,
  totalResumes,
  type Deal
} from '@site/src/components/fisherExact/model'
import { appendMathText } from '@site/src/components/math/formula'
import * as d3 from 'd3'

export interface DealState {
  /** The resumes drawn in the piles: the experiment, or the latest deal. */
  readonly deal: Deal
  /** Number of deals that gave each value of X. */
  readonly tally: ReadonlyMap<number, number>
  readonly deals: number
}

export interface DealChart {
  readonly update: (state: DealState, animate: boolean) => void
  readonly destroy: () => void
}

/** Values of X drawn under the piles; a deal outside them is counted but not drawn. */
export const COUNT_DOMAIN: readonly [number, number] = [150, 245]

/** Plot width below which the count axis is labelled every 20 rather than every 10. */
const NARROW_PLOT = 420

/** Tick values for an axis of counts over `COUNT_DOMAIN`, spaced to stay legible. */
export function countTicks(plotWidth: number): number[] {
  const [low, high] = COUNT_DOMAIN
  const step = plotWidth < NARROW_PLOT ? 20 : 10
  return d3.range(Math.ceil(low / step) * step, high + 1, step)
}

const MARGIN = { top: 12, right: 16, bottom: 44, left: 64 } as const
const PILE_GAP = 20
const HISTOGRAM_GAP = 36
const HISTOGRAM_HEIGHT = 130
/** Spacing of the dots, between these bounds, aiming at this many per row. */
const MIN_PITCH = 4
const MAX_PITCH = 7
const TARGET_COLUMNS = 95
const FADE_MS = 450
const FAINT = 0.14

interface Pile {
  readonly label: string
  readonly first: number
  readonly size: number
}

const PILES: readonly Pile[] = [
  { label: 'Z = 1', first: 0, size: resumes.white },
  { label: 'Z = 0', first: resumes.white, size: resumes.black }
]

/**
 * Draws the 4870 resumes as two piles of dots, filled when called back, over a
 * histogram of X, the called-back resumes in the pile of White-sounding names,
 * across the deals made so far.
 */
export function createDealChart(svgElement: SVGSVGElement, width: number): DealChart {
  const plotWidth = Math.max(width - MARGIN.left - MARGIN.right, 1)
  const pitch = Math.min(MAX_PITCH, Math.max(MIN_PITCH, plotWidth / TARGET_COLUMNS))
  const columns = Math.max(1, Math.floor(plotWidth / pitch))
  const pileHeight = Math.ceil(Math.max(resumes.white, resumes.black) / columns) * pitch
  const pileTop = (pile: number): number => pile * (pileHeight + PILE_GAP)
  const histogramTop = 2 * pileHeight + PILE_GAP + HISTOGRAM_GAP
  const height = MARGIN.top + histogramTop + HISTOGRAM_HEIGHT + MARGIN.bottom

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
  // The two piles of resumes
  // ---------------------------------------------------------------------------

  const slotPosition = (slot: number): readonly [number, number] => {
    const pile = slot < resumes.white ? 0 : 1
    const index = slot - (pile === 0 ? 0 : resumes.white)
    return [
      (index % columns) * pitch + pitch / 2,
      pileTop(pile) + Math.floor(index / columns) * pitch + pitch / 2
    ]
  }

  const dots = root
    .append('g')
    .selectAll<SVGCircleElement, number>('circle')
    .data(d3.range(totalResumes))
    .join('circle')
    .attr('cx', slot => slotPosition(slot)[0])
    .attr('cy', slot => slotPosition(slot)[1])
    .attr('r', pitch * 0.32)
    .attr('fill-opacity', FAINT)

  const pileCounts = PILES.map((pile, index) => {
    appendMathText(
      root
        .append('text')
        .attr('x', -MARGIN.left + 8)
        .attr('y', pileTop(index) + 12),
      pile.label
    )
    return root
      .append('text')
      .attr('x', -MARGIN.left + 8)
      .attr('y', pileTop(index) + 30)
  })

  // ---------------------------------------------------------------------------
  // The histogram of X across the deals
  // ---------------------------------------------------------------------------

  const histogram = root.append('g').attr('transform', `translate(0,${histogramTop})`)
  const [low, high] = COUNT_DOMAIN
  const counts = d3.range(low, high + 1)
  const x = d3
    .scaleLinear()
    .domain([low - 0.5, high + 0.5])
    .range([0, plotWidth])
  const barWidth = Math.max(1, x(1) - x(0) - 1)
  const y = d3.scaleLinear().range([HISTOGRAM_HEIGHT, 0])

  const observed = callbacks.white
  const mirror = Math.round(2 * expected - observed)

  const axis = histogram
    .append('g')
    .attr('transform', `translate(0,${HISTOGRAM_HEIGHT})`)
    .call(d3.axisBottom(x).tickValues(countTicks(plotWidth)).tickFormat(d3.format('d')))
  styleAxis(axis)
  appendMathText(
    histogram
      .append('text')
      .attr('x', plotWidth / 2)
      .attr('y', HISTOGRAM_HEIGHT + 38)
      .attr('text-anchor', 'middle'),
    'X'
  )

  const bars = histogram
    .append('g')
    .selectAll<SVGRectElement, number>('rect')
    .data(counts)
    .join('rect')
    .attr('x', k => x(k) - barWidth / 2)
    .attr('width', barWidth)
    .attr('y', HISTOGRAM_HEIGHT)
    .attr('height', 0)
    .attr('fill-opacity', k => (isExtreme(k, observed) ? 1 : 0.35))

  const expectedCurve = histogram
    .append('path')
    .attr('fill', 'none')
    .attr('stroke', 'currentColor')
    .attr('stroke-dasharray', '1 3')
    .attr('stroke-linecap', 'round')

  for (const [value, dash] of [
    [observed, 'none'],
    [mirror, '5 4']
  ] as const) {
    histogram
      .append('line')
      .attr('x1', x(value))
      .attr('x2', x(value))
      .attr('y1', 0)
      .attr('y2', HISTOGRAM_HEIGHT)
      .attr('stroke', 'currentColor')
      .attr('stroke-dasharray', dash)
    histogram
      .append('text')
      .attr('x', x(value))
      .attr('y', -4)
      .attr('text-anchor', 'middle')
      .text(value)
  }

  const update = (state: DealState, animate: boolean): void => {
    const duration = animate ? FADE_MS : 0
    const called = new Set(state.deal.callbackSlots)

    dots
      .transition()
      .duration(duration)
      .attr('fill-opacity', slot => (called.has(slot) ? 1 : FAINT))
      .attr('r', slot => (called.has(slot) ? pitch * 0.42 : pitch * 0.32))

    pileCounts.forEach((text, index) => {
      const pile = PILES[index]
      text.text(
        pile === undefined
          ? ''
          : state.deal.callbackSlots.filter(
              slot => slot >= pile.first && slot < pile.first + pile.size
            ).length
      )
    })

    const expectedCounts = counts.map(k => state.deals * probabilityOf(k))
    const tallest = Math.max(
      1,
      d3.max(counts, k => state.tally.get(k) ?? 0) ?? 0,
      ...expectedCounts
    )
    y.domain([0, tallest])

    bars
      .transition()
      .duration(duration)
      .attr('y', k => y(state.tally.get(k) ?? 0))
      .attr('height', k => HISTOGRAM_HEIGHT - y(state.tally.get(k) ?? 0))

    expectedCurve
      .attr('opacity', state.deals > 0 ? 1 : 0)
      .transition()
      .duration(duration)
      .attr(
        'd',
        d3.line<number>(
          k => x(k),
          k => y(state.deals * probabilityOf(k))
        )(counts)
      )
  }

  const destroy = (): void => {
    svg.selectAll('*').interrupt()
    svg.selectAll('*').remove()
  }

  return { update, destroy }
}
