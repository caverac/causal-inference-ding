import { CHART_FONT_FAMILY, CHART_FONT_SIZE } from '@site/src/components/chartStyle'
import { useContainerWidth } from '@site/src/components/hooks/useContainerWidth'
import MathText from '@site/src/components/math/MathText'
import {
  createChart,
  type Chart,
  type ChartHandlers,
  type ChartState
} from '@site/src/components/yuleSimpson/chart'
import {
  aggregated,
  departments,
  femaleRate,
  riskDifference,
  type Department,
  type Mode
} from '@site/src/components/yuleSimpson/model'
import * as d3 from 'd3'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

/** Share of the figure that must be on screen before the paths are drawn. */
const REVEAL_THRESHOLD = 0.35

const formatValue = d3.format('.3f')
const formatWeight = d3.format('.2f')

const MODES: readonly { readonly mode: Mode; readonly label: string }[] = [
  { mode: 'departments', label: 'By department' },
  { mode: 'aggregated', label: 'Aggregated' }
]

/** A formula shown under the chart, keyed by the quantity it states. */
interface ReadoutLine {
  readonly key: 'male' | 'female' | 'difference'
  readonly formula: string
}

/** The aggregated rates and their difference, or those of the focused department. */
function readout(state: ChartState): ReadoutLine[] {
  const department: Department | undefined = departments.find(
    candidate => candidate.department === state.focus
  )

  if (department === undefined) {
    return [
      { key: 'male', formula: `pr(Y = 1 | Z = 1) = ${formatValue(aggregated.rate_male)}` },
      { key: 'female', formula: `pr(Y = 1 | Z = 0) = ${formatValue(femaleRate(state.t))}` },
      { key: 'difference', formula: `rd = ${formatValue(riskDifference(state.t))}` }
    ]
  }

  const name = `D = \\mathrm{${department.department}}`
  return [
    {
      key: 'male',
      formula: `pr(Y = 1 | Z = 1, ${name}) = ${department.admitted_male}/${department.applicants_male} = ${formatValue(department.rate_male)}`
    },
    {
      key: 'female',
      formula: `pr(Y = 1 | Z = 0, ${name}) = ${department.admitted_female}/${department.applicants_female} = ${formatValue(department.rate_female)}`
    },
    { key: 'difference', formula: `rd = ${formatValue(department.risk_difference)}` }
  ]
}

/**
 * The Berkeley admissions in the geometry of Figure 1.2 of the book, with the
 * controls that take the Yule-Simpson paradox apart: rates within departments
 * against aggregated rates, and a reweighting of the women's applications.
 */
export default function YuleSimpsonExplorer(): ReactNode {
  const frameRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const chartRef = useRef<Chart | null>(null)
  const revealedRef = useRef(false)
  const width = useContainerWidth(frameRef)
  const [visible, setVisible] = useState(false)
  const [state, setState] = useState<ChartState>({ mode: 'departments', t: 0, focus: null })
  const stateRef = useRef(state)

  useEffect(() => {
    stateRef.current = state
    chartRef.current?.update(state)
  }, [state])

  useEffect(() => {
    const frame = frameRef.current
    if (frame === null) return

    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: REVEAL_THRESHOLD }
    )
    observer.observe(frame)

    return () => {
      observer.disconnect()
    }
  }, [])

  const handlers = useMemo<ChartHandlers>(
    () => ({
      onFocus: focus => {
        setState(previous => (previous.focus === focus ? previous : { ...previous, focus }))
      },
      onWeight: t => {
        setState(previous => ({ ...previous, t }))
      }
    }),
    []
  )

  useEffect(() => {
    const svg = svgRef.current
    if (svg === null || width === 0) return

    const chart = createChart(svg, width, handlers, { revealed: revealedRef.current })
    chartRef.current = chart
    chart.update(stateRef.current)

    return () => {
      chart.destroy()
      chartRef.current = null
    }
  }, [width, handlers])

  useEffect(() => {
    if (!visible || revealedRef.current || chartRef.current === null) return

    revealedRef.current = true
    chartRef.current.reveal()
  }, [visible, width])

  return (
    <div className="explorer" style={{ fontFamily: CHART_FONT_FAMILY, fontSize: CHART_FONT_SIZE }}>
      <div className="explorer__controls">
        <div className="explorer__toggle" role="group" aria-label="Admission rates">
          {MODES.map(({ mode, label }) => (
            <button
              key={mode}
              type="button"
              aria-pressed={state.mode === mode}
              onClick={() => {
                setState(previous => ({ ...previous, mode }))
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="explorer__slider">
          <MathText formula="t" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={state.t}
            aria-label="Weight t moving the distribution of women over departments to that of men"
            onChange={event => {
              handlers.onWeight(Number(event.target.value))
            }}
          />
          <output>{formatWeight(state.t)}</output>
        </label>
      </div>
      <div ref={frameRef} className="explorer__frame">
        <svg
          ref={svgRef}
          role="img"
          aria-label="Admitted against rejected applicants, department by department, for male and female applicants"
        />
      </div>
      <p className="explorer__readout" aria-live="polite">
        {readout(state).map(line => (
          <MathText key={line.key} formula={line.formula} />
        ))}
      </p>
    </div>
  )
}
