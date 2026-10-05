import useBrokenLinks from '@docusaurus/useBrokenLinks'
import type { ReactNode } from 'react'

interface ReferenceProps {
  /**
   * Anchor of the entry, such as 'ref-crook-2009', so that a citation in the
   * text can link to it with `[Crook et al. (2009)](#ref-crook-2009)`.
   */
  id: string
  /** The entry, as a paragraph. */
  children: ReactNode
}

/**
 * An entry of the reference list at the end of a page, which the citations in
 * the text link to. As with `Figure`, the anchor is registered with
 * Docusaurus, so a citation of a missing entry fails the build.
 */
export default function Reference({ id, children }: ReferenceProps): ReactNode {
  useBrokenLinks().collectAnchor(id)

  return (
    <li id={id} className="doc-reference">
      {children}
    </li>
  )
}
