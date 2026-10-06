import useBrokenLinks from '@docusaurus/useBrokenLinks'
import type { ReactNode } from 'react'

interface FigureProps {
  /**
   * Anchor of the figure, such as 'figure-1', so that text can link to it with
   * `[Figure 1](#figure-1)`.
   */
  id: string
  /** The figure itself, followed by its `<figcaption>`. */
  children: ReactNode
}

/**
 * A figure that text on the page can link to.
 *
 * Docusaurus checks every link to an anchor at build time, but it only knows
 * the anchors that are registered with it, as headings do. An `id` written on a
 * plain `<figure>` is not registered, so a link to it fails the build; this
 * component registers its anchor the same way headings do, which keeps links
 * to missing figures an error.
 */
export default function Figure({ id, children }: FigureProps): ReactNode {
  useBrokenLinks().collectAnchor(id)

  return (
    <figure id={id} className="doc-figure">
      {children}
    </figure>
  )
}
