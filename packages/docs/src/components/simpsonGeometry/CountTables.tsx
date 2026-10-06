import MathText from '@site/src/components/math/MathText'
import {
  ARMS,
  pieceOf,
  sameVector,
  type Arm,
  type ArmVectors,
  type Piece,
  type VectorId
} from '@site/src/components/simpsonGeometry/model'
import * as d3 from 'd3'
import type { ReactNode } from 'react'

/** Counts with thousands separators, and one decimal where a count is not whole. */
const formatCount = d3.format(',.1~f')

const TITLE: Readonly<Record<Piece, string>> = {
  aggregated: 'whole population',
  '1': 'subpopulation X = 1',
  '0': 'subpopulation X = 0'
}

const ROW_LABEL: Readonly<Record<Arm, string>> = { treated: 'Z = 1', control: 'Z = 0' }

interface CountTablesProps {
  /** The vectors of both arms, whose coordinates are the failures and successes of each row. */
  readonly vectors: Readonly<Record<Arm, ArmVectors>>
  readonly focus: VectorId | null
  /** Called with the vector of a row when the pointer or the keyboard enters it, and when it leaves. */
  readonly onEnter: (vector: VectorId) => void
  readonly onLeave: (vector: VectorId) => void
}

/**
 * The counts of a two-by-two-by-two table laid out as in Section 1.3.3 of the
 * book, one two-by-two table per population with rows Z and columns Y, in the
 * book's order: the whole population above the two subpopulations it adds up.
 * Each row is one vector of the plane, and pointing at a row or tabbing to it
 * focuses that vector.
 */
export default function CountTables({
  vectors,
  focus,
  onEnter,
  onLeave
}: CountTablesProps): ReactNode {
  const table = (piece: Piece): ReactNode => (
    <table>
      <thead>
        <tr>
          <th scope="col">
            <MathText formula={TITLE[piece]} />
          </th>
          <th scope="col">
            <MathText formula="Y = 1" />
          </th>
          <th scope="col">
            <MathText formula="Y = 0" />
          </th>
        </tr>
      </thead>
      <tbody>
        {ARMS.map(arm => {
          const vector: VectorId = { arm, piece }
          const point = pieceOf(vectors[arm], piece)

          return (
            <tr
              key={arm}
              tabIndex={0}
              className={sameVector(focus, vector) ? 'explorer__row--focused' : undefined}
              onMouseEnter={() => {
                onEnter(vector)
              }}
              onMouseLeave={() => {
                onLeave(vector)
              }}
              onFocus={() => {
                onEnter(vector)
              }}
              onBlur={() => {
                onLeave(vector)
              }}
            >
              <th scope="row">
                <MathText formula={ROW_LABEL[arm]} />
              </th>
              <td>{formatCount(point.y)}</td>
              <td>{formatCount(point.x)}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )

  return (
    <div className="explorer__tables">
      {table('aggregated')}
      <div className="explorer__subtables">
        {table('1')}
        {table('0')}
      </div>
    </div>
  )
}
