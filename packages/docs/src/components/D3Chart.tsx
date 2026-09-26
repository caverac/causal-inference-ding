import * as d3 from 'd3'
import { useEffect, useRef, type ReactNode } from 'react'

interface D3ChartProps {
  width?: number
  height?: number
  /**
   * Draws the chart into an emptied SVG element. The chart is redrawn whenever
   * this function changes identity, so define it outside the component that
   * renders the chart, or memoize it.
   */
  render: (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) => void
}

/**
 * A container for a D3 drawing embedded in an MDX page.
 *
 * Usage:
 * ```tsx
 * <D3Chart
 *   width={400}
 *   height={300}
 *   render={svg => {
 *     svg.append('circle').attr('cx', 200).attr('cy', 150).attr('r', 50)
 *   }}
 * />
 * ```
 */
export default function D3Chart({ width = 400, height = 300, render }: D3ChartProps): ReactNode {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (svgRef.current === null) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`)

    render(svg)
  }, [width, height, render])

  return (
    <div className="d3-container">
      <svg ref={svgRef} />
    </div>
  )
}
