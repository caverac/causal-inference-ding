import { CHART_FONT_FAMILY, CHART_FONT_SIZE } from '@site/src/components/chartStyle'
import { COUNT_DOMAIN } from '@site/src/components/fisherExact/dealChart'
import {
  callbacks,
  expected,
  lowerTail,
  twoSidedPValue,
  upperTail
} from '@site/src/components/fisherExact/model'
import { createNullChart, type NullChart } from '@site/src/components/fisherExact/nullChart'
import { useContainerWidth } from '@site/src/components/hooks/useContainerWidth'
import MathText from '@site/src/components/math/MathText'
import * as d3 from 'd3'
import { useEffect, useRef, useState, type ReactNode } from 'react'

/** Probabilities in plain decimals with three significant digits, e.g. 0.0000476. */
const formatProbability = d3.format('.3r')

/**
 * The exact null distribution of X, with a chosen count x and the counts at
 * least as extreme, whose probabilities add up to the two-sided p-value.
 */
export default function NullDistributionExplorer(): ReactNode {
  const frameRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const chartRef = useRef<NullChart | null>(null)
  const width = useContainerWidth(frameRef)
  const [k, setK] = useState<number>(callbacks.white)
  const kRef = useRef(k)

  useEffect(() => {
    kRef.current = k
    chartRef.current?.update(k)
  }, [k])

  useEffect(() => {
    const svg = svgRef.current
    if (svg === null || width === 0) return

    const chart = createNullChart(svg, width, setK)
    chartRef.current = chart
    chart.update(kRef.current)

    return () => {
      chart.destroy()
      chartRef.current = null
    }
  }, [width])

  const [low, high] = COUNT_DOMAIN
  const tail =
    k >= expected
      ? { formula: `pr(X \u2265 ${k})`, value: upperTail(k) }
      : { formula: `pr(X \u2264 ${k})`, value: lowerTail(k) }

  return (
    <div className="explorer" style={{ fontFamily: CHART_FONT_FAMILY, fontSize: CHART_FONT_SIZE }}>
      <div className="explorer__controls">
        <label className="explorer__slider">
          <MathText formula="x" />
          <input
            type="range"
            min={low}
            max={high}
            step={1}
            value={k}
            aria-label="Count x of callbacks among White-sounding names"
            onChange={event => {
              setK(Number(event.target.value))
            }}
          />
          <output>{k}</output>
        </label>
      </div>
      <div ref={frameRef} className="explorer__frame">
        <svg
          ref={svgRef}
          role="img"
          aria-label="Null distribution of the callbacks among White-sounding names, on a linear and on a log scale, with the counts at least as extreme as the chosen one filled"
        />
      </div>
      <p className="explorer__readout" aria-live="polite">
        <MathText formula={`${tail.formula} = ${formatProbability(tail.value)}`} />
        <MathText formula={`p = ${formatProbability(twoSidedPValue(k))}`} />
      </p>
    </div>
  )
}
