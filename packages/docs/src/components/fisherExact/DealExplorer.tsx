import { CHART_FONT_FAMILY, CHART_FONT_SIZE } from '@site/src/components/chartStyle'
import {
  createDealChart,
  type DealChart,
  type DealState
} from '@site/src/components/fisherExact/dealChart'
import {
  callbacks,
  deal,
  expected,
  isExtreme,
  observedDeal,
  type Deal
} from '@site/src/components/fisherExact/model'
import { useContainerWidth } from '@site/src/components/hooks/useContainerWidth'
import MathText from '@site/src/components/math/MathText'
import * as d3 from 'd3'
import { useEffect, useRef, useState, type ReactNode } from 'react'

const MANY_DEALS = 1000

const formatCount = d3.format(',')

interface ExplorerState extends DealState {
  /** Whether the piles show the experiment rather than a deal. */
  readonly showingExperiment: boolean
  /** Deals at least as extreme as the experiment. */
  readonly extreme: number
}

const OBSERVED = callbacks.white
const MIRROR = Math.round(2 * expected - OBSERVED)

function startingState(): ExplorerState {
  return {
    deal: observedDeal(Math.random),
    tally: new Map(),
    deals: 0,
    extreme: 0,
    showingExperiment: true
  }
}

/** Adds `latest` deals to the tallies of `state`, and shows the last of them. */
function withDeals(state: ExplorerState, latest: readonly Deal[]): ExplorerState {
  const tally = new Map(state.tally)
  let extreme = state.extreme
  for (const next of latest) {
    tally.set(next.white, (tally.get(next.white) ?? 0) + 1)
    if (isExtreme(next.white, OBSERVED)) {
      extreme += 1
    }
  }

  return {
    deal: latest.at(-1) ?? state.deal,
    tally,
    deals: state.deals + latest.length,
    extreme,
    showingExperiment: latest.length === 0 && state.showingExperiment
  }
}

/**
 * The resumes of Example 1.1 dealt into piles of White- and Black-sounding
 * names, as the random assignment would have dealt them if names made no
 * difference, with a histogram of the callbacks each deal gives the first pile.
 */
export default function DealExplorer(): ReactNode {
  const frameRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const chartRef = useRef<DealChart | null>(null)
  const width = useContainerWidth(frameRef)
  const [state, setState] = useState<ExplorerState>(startingState)
  const [animate, setAnimate] = useState(false)
  const stateRef = useRef(state)

  useEffect(() => {
    stateRef.current = state
    chartRef.current?.update(state, animate)
  }, [state, animate])

  useEffect(() => {
    const svg = svgRef.current
    if (svg === null || width === 0) return

    const chart = createDealChart(svg, width)
    chartRef.current = chart
    chart.update(stateRef.current, false)

    return () => {
      chart.destroy()
      chartRef.current = null
    }
  }, [width])

  const act = (next: (previous: ExplorerState) => ExplorerState, animated: boolean): void => {
    setAnimate(animated)
    setState(next)
  }

  const shown = state.showingExperiment ? 'the experiment' : 'this deal'

  return (
    <div className="explorer" style={{ fontFamily: CHART_FONT_FAMILY, fontSize: CHART_FONT_SIZE }}>
      <div className="explorer__controls">
        <div className="explorer__buttons">
          <button
            type="button"
            onClick={() => {
              act(previous => withDeals(previous, [deal(Math.random)]), true)
            }}
          >
            Deal once
          </button>
          <button
            type="button"
            onClick={() => {
              act(
                previous =>
                  withDeals(
                    previous,
                    Array.from({ length: MANY_DEALS }, () => deal(Math.random))
                  ),
                false
              )
            }}
          >
            Deal {formatCount(MANY_DEALS)} times
          </button>
          <button
            type="button"
            onClick={() => {
              act(
                previous => ({
                  ...previous,
                  deal: observedDeal(Math.random),
                  showingExperiment: true
                }),
                true
              )
            }}
          >
            Show the experiment
          </button>
          <button
            type="button"
            onClick={() => {
              act(startingState, true)
            }}
          >
            Clear
          </button>
        </div>
      </div>
      <div ref={frameRef} className="explorer__frame">
        <svg
          ref={svgRef}
          role="img"
          aria-label="Resumes dealt into two piles by the name they carry, with called-back resumes filled, over a histogram of the called-back resumes in the first pile across deals"
        />
      </div>
      <p className="explorer__readout" aria-live="polite">
        <span>
          In {shown}, <MathText formula={`X = ${state.deal.white}`} />
        </span>
        <span>Deals: {formatCount(state.deals)}</span>
        <span>
          As extreme as the experiment, <MathText formula={`X \u2265 ${OBSERVED}`} /> or{' '}
          <MathText formula={`X \u2264 ${MIRROR}`} />: {formatCount(state.extreme)}
        </span>
      </p>
    </div>
  )
}
