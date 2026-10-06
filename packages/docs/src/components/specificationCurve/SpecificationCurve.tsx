import { CHART_FONT_FAMILY, CHART_FONT_SIZE } from '@site/src/components/chartStyle'
import { useContainerWidth } from '@site/src/components/hooks/useContainerWidth'
import MathText from '@site/src/components/math/MathText'
import {
  createCurveChart,
  type CurveChart,
  type CurveState
} from '@site/src/components/specificationCurve/chart'
import {
  countSignificance,
  covariates,
  formatPValue,
  includedCovariates,
  specifications,
  splitByCovariate,
  type SignificanceCounts
} from '@site/src/components/specificationCurve/model'
import * as d3 from 'd3'
import { useEffect, useRef, useState, type ReactNode } from 'react'

/** Dollar amounts with thousands separators and one decimal, e.g. 1,067.5. */
const formatDollars = d3.format(',.1f')

function describeCounts(counts: SignificanceCounts): string {
  return `positive ${counts.positive}, negative ${counts.negative}, not significant ${counts.none}`
}

/**
 * A line under the chart: a formula, set like the labels of the chart, or
 * plain text, which keeps covariate names such as u74 as they are written.
 */
interface ReadoutLine {
  readonly text: string
  readonly math: boolean
}

const formula = (text: string): ReadoutLine => ({ text, math: true })
const plain = (text: string): ReadoutLine => ({ text, math: false })

/** The lines under the chart: the hovered regression, the split by the selected covariate, or the totals. */
function readout({ hovered, selected }: CurveState): ReadoutLine[] {
  const specification = hovered === null ? undefined : specifications[hovered]
  if (specification !== undefined) {
    const included = includedCovariates(specification)
    return [
      formula(`\u03b2 = ${formatDollars(specification.estimate)}`),
      plain(
        `95% CI [${formatDollars(specification.conf_low)}, ${formatDollars(specification.conf_high)}]`
      ),
      formula(`p = ${formatPValue(specification.p_value)}`),
      plain(included.length === 0 ? 'no covariates' : included.join(', '))
    ]
  }

  const name = selected === null ? undefined : covariates[selected]
  if (selected !== null && name !== undefined) {
    const split = splitByCovariate(selected)
    return [
      plain(`with ${name}: ${describeCounts(countSignificance(split.with))}`),
      plain(`without ${name}: ${describeCounts(countSignificance(split.without))}`)
    ]
  }

  return [plain(`all 1024: ${describeCounts(countSignificance(specifications))}`)]
}

/**
 * The specification curve of Problem 1.4, with a toggle per covariate that
 * brings forward the regressions including it, and a readout of the regression
 * under the pointer.
 */
export default function SpecificationCurve(): ReactNode {
  const frameRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const chartRef = useRef<CurveChart | null>(null)
  const width = useContainerWidth(frameRef)
  const [state, setState] = useState<CurveState>({ hovered: null, selected: null })
  const stateRef = useRef(state)

  useEffect(() => {
    stateRef.current = state
    chartRef.current?.update(state)
  }, [state])

  useEffect(() => {
    const svg = svgRef.current
    if (svg === null || width === 0) return

    const chart = createCurveChart(svg, width, hovered => {
      setState(previous => (previous.hovered === hovered ? previous : { ...previous, hovered }))
    })
    chartRef.current = chart
    chart.update(stateRef.current)

    return () => {
      chart.destroy()
      chartRef.current = null
    }
  }, [width])

  return (
    <div className="explorer" style={{ fontFamily: CHART_FONT_FAMILY, fontSize: CHART_FONT_SIZE }}>
      <div className="explorer__controls">
        <div
          className="explorer__toggle"
          role="group"
          aria-label="Bring forward the regressions including"
        >
          {covariates.map((name, index) => (
            <button
              key={name}
              type="button"
              aria-pressed={state.selected === index}
              onClick={() => {
                setState(previous => ({
                  ...previous,
                  selected: previous.selected === index ? null : index
                }))
              }}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
      <div ref={frameRef} className="explorer__frame">
        <svg
          ref={svgRef}
          role="img"
          aria-label="Estimated coefficient of treat in each of the 1024 regressions, by increasing value, over the covariates each includes"
        />
      </div>
      <p className="explorer__readout" aria-live="polite">
        {readout(state).map(line =>
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
