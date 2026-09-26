import { usePluginData } from '@docusaurus/useGlobalData'
import { CHART_FONT_FAMILY, CHART_FONT_SIZE, styleAxis } from '@site/src/components/chartStyle'
import { parts, totalUnits, unitDocId } from '@site/src/data/book'
import {
  isProblemCounts,
  PROBLEM_COUNTS_PLUGIN,
  type ProblemCounts
} from '@site/src/data/problemCounts'
import * as d3 from 'd3'
import { useEffect, useMemo, useRef, type ReactNode } from 'react'

interface ProgressBarProps {
  width?: number
  height?: number
  animationDuration?: number
}

interface PartProgress {
  numeral: string
  /** Solution pages of the part holding at least one solved problem. */
  started: number
  /** Solution pages of the part. */
  total: number
  /** Solved problems across the pages of the part. */
  problems: number
}

function useProblemCounts(): ProblemCounts {
  const data = usePluginData(PROBLEM_COUNTS_PLUGIN)

  if (!isProblemCounts(data)) {
    throw new Error(`The ${PROBLEM_COUNTS_PLUGIN} plugin published data of an unexpected shape.`)
  }

  return data
}

function summarize(counts: ProblemCounts): PartProgress[] {
  return parts.map(part => {
    const perUnit = part.units.map(unit => counts[unitDocId(part, unit)] ?? 0)

    return {
      numeral: part.numeral,
      started: perUnit.filter(count => count > 0).length,
      total: part.units.length,
      problems: d3.sum(perUnit)
    }
  })
}

/**
 * Per-part progress: for each part, the number of chapters or appendices that
 * carry at least one solved problem, drawn in full ink over the number the part
 * contains, drawn faint.
 */
export default function ProgressBar({
  width = 600,
  height = 260,
  animationDuration = 800
}: ProgressBarProps): ReactNode {
  const svgRef = useRef<SVGSVGElement>(null)
  const counts = useProblemCounts()
  const data = useMemo(() => summarize(counts), [counts])

  useEffect(() => {
    if (svgRef.current === null) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const margin = { top: 24, right: 16, bottom: 32, left: 32 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    const x = d3
      .scaleBand()
      .domain(data.map(d => d.numeral))
      .range([0, innerWidth])
      .padding(0.3)
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data, d => d.total) ?? 1])
      .nice()
      .range([innerHeight, 0])

    const bar = (className: string, value: (d: PartProgress) => number, opacity: number): void => {
      g.selectAll(`.${className}`)
        .data(data)
        .join('rect')
        .attr('class', className)
        .attr('x', d => x(d.numeral) ?? 0)
        .attr('width', x.bandwidth())
        .attr('y', innerHeight)
        .attr('height', 0)
        .attr('fill', 'currentColor')
        .attr('fill-opacity', opacity)
        .transition()
        .duration(animationDuration)
        .ease(d3.easeCubicOut)
        .attr('y', d => y(value(d)))
        .attr('height', d => innerHeight - y(value(d)))
    }
    bar('bar-total', d => d.total, 0.15)
    bar('bar-started', d => d.started, 1)

    g.selectAll('.bar-label')
      .data(data)
      .join('text')
      .attr('class', 'bar-label')
      .attr('x', d => (x(d.numeral) ?? 0) + x.bandwidth() / 2)
      .attr('y', d => y(d.total) - 6)
      .attr('text-anchor', 'middle')
      .attr('font-family', CHART_FONT_FAMILY)
      .attr('font-size', CHART_FONT_SIZE)
      .attr('fill', 'currentColor')
      .text(d => `${d.started}/${d.total}`)

    const xAxis = g
      .append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x))
    const yAxis = g.append('g').call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('d')))
    styleAxis(xAxis)
    styleAxis(yAxis)
  }, [data, width, height, animationDuration])

  const started = d3.sum(data, d => d.started)
  const problems = d3.sum(data, d => d.problems)

  return (
    <figure className="doc-figure">
      <div className="d3-container">
        <svg ref={svgRef} />
      </div>
      <figcaption>
        {started} of {totalUnits} solution pages started, {problems} problems solved.
      </figcaption>
    </figure>
  )
}
