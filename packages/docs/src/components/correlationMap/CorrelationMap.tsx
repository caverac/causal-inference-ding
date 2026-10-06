import { CHART_FONT_FAMILY, CHART_FONT_SIZE } from '@site/src/components/chartStyle'
import {
  createCorrelationChart,
  type CorrelationChart,
  type CorrelationFocus
} from '@site/src/components/correlationMap/chart'
import {
  baseline,
  correlation,
  covariates,
  variables
} from '@site/src/components/correlationMap/model'
import { useContainerWidth } from '@site/src/components/hooks/useContainerWidth'
import MathText from '@site/src/components/math/MathText'
import * as d3 from 'd3'
import { useEffect, useRef, useState, type ReactNode } from 'react'

const formatCorrelation = d3.format('.3f')
/** Dollar amounts with thousands separators and one decimal, e.g. -8,506.5. */
const formatDollars = d3.format(',.1f')
const formatChange = d3.format('+,.1f')

/**
 * A line under the chart: a formula, set like the labels of the chart, or
 * plain text, which keeps variable names such as u74 as they are written.
 */
interface ReadoutLine {
  readonly text: string
  readonly math: boolean
}

const formula = (text: string): ReadoutLine => ({ text, math: true })
const plain = (text: string): ReadoutLine => ({ text, math: false })

/** The lines under the chart: a correlation, a covariate, or the coefficient without covariates. */
function readout(focus: CorrelationFocus | null): ReadoutLine[] {
  const [first, second] = focus?.variables ?? []
  const firstName = first === undefined ? undefined : variables[first]
  const secondName = second === undefined ? undefined : variables[second]

  if (
    first !== undefined &&
    second !== undefined &&
    firstName !== undefined &&
    secondName !== undefined
  ) {
    return [
      plain(`${secondName} and ${firstName}`),
      formula(`r = ${formatCorrelation(correlation(first, second))}`)
    ]
  }

  const covariate = covariates.find(candidate => candidate.name === firstName)
  if (covariate !== undefined) {
    return [
      plain(covariate.name),
      formula(`\\rho_{ZX} = ${formatCorrelation(covariate.rho_zx)}`),
      formula(`\\rho_{YX|Z} = ${formatCorrelation(covariate.rho_yx_z)}`),
      formula(`\\beta: ${formatDollars(baseline)} \\to ${formatDollars(covariate.estimate)}`),
      formula(`\\Delta\\beta = ${formatChange(covariate.shift)}`)
    ]
  }

  return [formula(`\\beta = ${formatDollars(baseline)} without covariates`)]
}

/**
 * The correlations of the LaLonde observational data, and how they move the
 * coefficient of `treat` when a covariate is added, with the two panels
 * focused together.
 */
export default function CorrelationMap(): ReactNode {
  const frameRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const chartRef = useRef<CorrelationChart | null>(null)
  const width = useContainerWidth(frameRef)
  const [focus, setFocus] = useState<CorrelationFocus | null>(null)
  const focusRef = useRef(focus)

  useEffect(() => {
    focusRef.current = focus
    chartRef.current?.update(focus)
  }, [focus])

  useEffect(() => {
    const svg = svgRef.current
    if (svg === null || width === 0) return

    const chart = createCorrelationChart(svg, width, setFocus)
    chartRef.current = chart
    chart.update(focusRef.current)

    return () => {
      chart.destroy()
      chartRef.current = null
    }
  }, [width])

  return (
    <div className="explorer" style={{ fontFamily: CHART_FONT_FAMILY, fontSize: CHART_FONT_SIZE }}>
      <div ref={frameRef} className="explorer__frame">
        <svg
          ref={svgRef}
          role="img"
          aria-label="Correlation matrix of the LaLonde data, and the covariates in the plane of their correlations with the treatment and the outcome, over contours of the change each makes to the coefficient of treat"
        />
      </div>
      <p className="explorer__readout" aria-live="polite">
        {readout(focus).map(line =>
          line.math ? (
            <MathText key={line.text} formula={line.text} />
          ) : (
            <span key={line.text}>{line.text}</span>
          )
        )}
      </p>
    </div>
  )
}
