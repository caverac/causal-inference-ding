#' Callbacks in the resume experiment of Bertrand and Mullainathan (2004)
#'
#' The data of Example 1.1 of Ding (2024): fictitious resumes sent to job ads
#' in Boston and Chicago, with White-sounding (\eqn{Z = 1}{Z = 1}) or Black-
#' sounding (\eqn{Z = 0}{Z = 0}) names assigned at random, and the outcome
#' \eqn{Y = 1}{Y = 1} when the employer called back. The function returns the
#' counts together with the exact null distribution behind the p-value that
#' [stats::fisher.test()] reports for them.
#'
#' @return (`list`) With elements
#'   * `resumes` and `callbacks` (`list`): per group, `white` and `black`
#'     (`integer(1)`), the number of resumes and of callbacks.
#'   * `null` (`list`): the expected value `expected` and standard deviation
#'     `sd` (`numeric(1)`) of the number of callbacks among White-sounding
#'     names when names make no difference, and its `distribution`, as
#'     returned by [fisher_null_distribution()].
#'   * `p_value` (`list`): the two-sided p-value `two_sided` (`numeric(1)`)
#'     and its two parts, `upper`, the probability of at least as many
#'     callbacks among White-sounding names as observed, and `lower`, the
#'     probability of the counts below the observed one that are no more
#'     likely than it.
#' @references Bertrand, M. and Mullainathan, S. (2004). Are Emily and Greg
#'   more employable than Lakisha and Jamal? A field experiment on labor market
#'   discrimination. *American Economic Review*, 94(4), 991-1013.
#'   \doi{10.1257/0002828042002561}
#'
#'   Ding, P. (2024). *A First Course in Causal Inference*. Chapman and
#'   Hall/CRC. \doi{10.1201/9781003484080}
#' @seealso [fisher_null_distribution()], [fisher_p_value()]
#' @export
#' @examples
#' resume_callbacks()$p_value$two_sided
resume_callbacks <- function() {
  # The table of Example 1.1: rows are White- and Black-sounding names,
  # columns are callback and no callback.
  counts <- matrix(c(235L, 157L, 2200L, 2278L), nrow = 2L)
  null <- fisher_null_distribution(counts)
  expected <- sum(null$k * null$probability)
  observed <- counts[1L, 1L]
  extreme <- fisher_extreme(null, observed)

  list(
    resumes = list(white = sum(counts[1L, ]), black = sum(counts[2L, ])),
    callbacks = list(white = counts[1L, 1L], black = counts[2L, 1L]),
    null = list(
      expected = expected,
      sd = sqrt(sum((null$k - expected)^2L * null$probability)),
      distribution = null
    ),
    p_value = list(
      upper = sum(null$probability[extreme & null$k >= observed]),
      lower = sum(null$probability[extreme & null$k < observed]),
      two_sided = fisher_p_value(counts)
    )
  )
}
