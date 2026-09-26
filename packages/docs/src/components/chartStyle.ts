import type * as d3 from 'd3'

/**
 * Shared typography and ink for every chart on the site. A single font size is
 * used for all text in a chart, and ink is inherited from the surrounding text
 * through `currentColor`, so charts stay legible in the light and dark themes
 * and series are told apart by line style rather than by hue.
 */
export const CHART_FONT_FAMILY = 'Georgia, serif'
export const CHART_FONT_SIZE = '13px'

/** Applies the shared typography and ink to the text and strokes of an axis. */
export function styleAxis(axis: d3.Selection<SVGGElement, unknown, null, undefined>): void {
  axis
    .selectAll('text')
    .attr('font-family', CHART_FONT_FAMILY)
    .attr('font-size', CHART_FONT_SIZE)
    .attr('fill', 'currentColor')
  axis.selectAll('path, line').attr('stroke', 'currentColor').attr('stroke-opacity', 0.4)
}
