import Link from '@docusaurus/Link'
import { parts, unitDocId, unitPrefix } from '@site/src/data/book'
import type { ReactNode } from 'react'

interface UnitListProps {
  partId: number
}

/**
 * Lists the chapters or appendices of a part, in the order they appear in the
 * book, linking to the corresponding solution page.
 *
 * The list is derived from `src/data/book.ts`, so a part index never has to be
 * edited by hand.
 */
export default function UnitList({ partId }: UnitListProps): ReactNode {
  const part = parts.find(candidate => candidate.id === partId)

  if (part === undefined) {
    return null
  }

  return (
    <ul className="unit-list">
      {part.units.map(unit => (
        <li key={unit.slug}>
          <Link to={`/${unitDocId(part, unit)}`}>
            {unitPrefix(unit)}: {unit.title}
          </Link>
        </li>
      ))}
    </ul>
  )
}
