import type { ReactNode } from 'react'

interface ReferencesProps {
  /** The entries, as `Reference` elements in alphabetical order. */
  children: ReactNode
}

/** The reference list at the end of a page. */
export default function References({ children }: ReferencesProps): ReactNode {
  return <ul className="doc-references">{children}</ul>
}
