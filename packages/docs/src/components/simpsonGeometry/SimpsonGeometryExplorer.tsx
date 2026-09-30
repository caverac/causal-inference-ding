import { CHART_FONT_FAMILY, CHART_FONT_SIZE } from '@site/src/components/chartStyle'
import { useContainerWidth } from '@site/src/components/hooks/useContainerWidth'
import MathText from '@site/src/components/math/MathText'
import { createPlaneChart, type PlaneChart } from '@site/src/components/simpsonGeometry/chart'
import {
  example,
  riskDifference,
  type ExampleName
} from '@site/src/components/simpsonGeometry/model'
import * as d3 from 'd3'
import { useEffect, useRef, useState, type ReactNode } from 'react'

/** Shares with three decimals, e.g. 0.909. */
const formatShare = d3.format('.3f')
/** Risk differences with three significant digits, e.g. -0.100 or 0.00280. */
const formatDifference = d3.format('.3r')

interface SimpsonGeometryExplorerProps {
  /** Which table of `yule_simpson_examples()` to draw. */
  readonly name: ExampleName
}

/**
 * A two-by-two-by-two table in the geometry of Figure 1.2 of the book, with a
 * slider that moves the treated arm's units between the two subgroups while
 * every subgroup keeps its success rate.
 */
export default function SimpsonGeometryExplorer({ name }: SimpsonGeometryExplorerProps): ReactNode {
  const data = example(name)
  const frameRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const chartRef = useRef<PlaneChart | null>(null)
  const width = useContainerWidth(frameRef)
  const [share, setShare] = useState<number>(data.treated.share)
  const shareRef = useRef(share)

  useEffect(() => {
    shareRef.current = share
    chartRef.current?.update(share)
  }, [share])

  useEffect(() => {
    const svg = svgRef.current
    if (svg === null || width === 0) return

    const chart = createPlaneChart(svg, width, data, {
      markerId: `simpson-arrow-${name}`,
      onShare: setShare
    })
    chartRef.current = chart
    chart.update(shareRef.current)

    return () => {
      chart.destroy()
      chartRef.current = null
    }
  }, [width, data, name])

  return (
    <div className="explorer" style={{ fontFamily: CHART_FONT_FAMILY, fontSize: CHART_FONT_SIZE }}>
      <div className="explorer__controls">
        <div className="explorer__buttons">
          <button
            type="button"
            onClick={() => {
              setShare(data.treated.share)
            }}
          >
            Observed
          </button>
          <button
            type="button"
            onClick={() => {
              setShare(data.control.share)
            }}
          >
            Same mix
          </button>
        </div>
        <label className="explorer__slider">
          <MathText formula="pr(X = 1 | Z = 1)" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={share}
            aria-label="Share of the treated arm in the subgroup X = 1"
            onChange={event => {
              setShare(Number(event.target.value))
            }}
          />
          <output>{formatShare(share)}</output>
        </label>
      </div>
      <div ref={frameRef} className="explorer__frame">
        <svg
          ref={svgRef}
          role="img"
          aria-label="Successes against failures of the treated and control arms, within each subgroup and aggregated"
        />
      </div>
      <p className="explorer__readout" aria-live="polite">
        <MathText formula={`rd_{1} = ${formatDifference(data.risk_difference['1'])}`} />
        <MathText formula={`rd_{0} = ${formatDifference(data.risk_difference['0'])}`} />
        <MathText formula={`rd = ${formatDifference(riskDifference(data, share))}`} />
      </p>
    </div>
  )
}
