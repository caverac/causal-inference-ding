#' Null distribution of Fisher's exact test
#'
#' With every row and column total of a two-by-two table held fixed, and no
#' association between the rows and the columns, the count \eqn{n_{11}}{n_11}
#' in the first row and first column follows a hypergeometric distribution.
#' In a randomized experiment with fixed group sizes this is also the
#' distribution produced by the random assignment alone, when the treatment
#' changes no unit's outcome: the Fisher randomization test of Section 3.2 of
#' Ding (2024), see Problem 3.4.
#'
#' @param counts (`matrix`) Two-by-two matrix of non-negative whole-number
#'   counts, laid out as for [risk_difference()]: rows \eqn{Z = 1}{Z = 1} and
#'   \eqn{Z = 0}{Z = 0}, columns \eqn{Y = 1}{Y = 1} and \eqn{Y = 0}{Y = 0}.
#' @return (`data.frame`) One row per value \eqn{k}{k} of \eqn{n_{11}}{n_11}
#'   compatible with the totals, in increasing order, with columns `k`
#'   (`integer`), `probability` (`numeric`) and `log10_probability`
#'   (`numeric`), the last computed directly so that it stays finite where the
#'   probability itself underflows.
#' @references Ding, P. (2024). *A First Course in Causal Inference*.
#'   Chapman and Hall/CRC. \doi{10.1201/9781003484080}
#' @seealso [fisher_p_value()]
#' @export
#' @examples
#' fisher_null_distribution(matrix(c(3L, 1L, 1L, 3L), nrow = 2L))
fisher_null_distribution <- function(counts) {
  assert_two_by_two(counts)

  total <- sum(counts)
  treated <- sum(counts[1L, ])
  successes <- sum(counts[, 1L])
  k <- seq.int(max(0L, treated + successes - total), min(treated, successes))

  data.frame(
    k = as.integer(k),
    probability = stats::dhyper(k, successes, total - successes, treated),
    log10_probability = stats::dhyper(k, successes, total - successes, treated, log = TRUE) /
      log(10.0)
  )
}

#' Two-sided p-value of Fisher's exact test
#'
#' Adds the null probabilities of every value of \eqn{n_{11}}{n_11} that is no
#' more likely than the observed one, the rule [stats::fisher.test()] uses for
#' its two-sided p-value, including its relative tolerance of \eqn{10^{-7}}{1e-7}
#' when comparing probabilities.
#'
#' @inheritParams fisher_null_distribution
#' @return (`numeric(1)`) The two-sided p-value, in \eqn{(0, 1]}{(0, 1]}.
#' @seealso [fisher_null_distribution()]
#' @export
#' @examples
#' fisher_p_value(matrix(c(3L, 1L, 1L, 3L), nrow = 2L))
fisher_p_value <- function(counts) {
  null <- fisher_null_distribution(counts)

  sum(null$probability[fisher_extreme(null, counts[1L, 1L])])
}

#' Values of a null distribution at least as extreme as an observed one
#'
#' @param null (`data.frame`) As returned by [fisher_null_distribution()].
#' @param observed (`integer(1)`) Observed value of the first cell.
#' @return (`logical`) For each row of `null`, whether its value is no more
#'   likely than `observed`, with the relative tolerance of
#'   [stats::fisher.test()].
#' @keywords internal
#' @noRd
fisher_extreme <- function(null, observed) {
  null$probability <= null$probability[null$k == observed] * (1.0 + 1e-7)
}

#' Assert that counts form a two-by-two table
#'
#' @param counts Object to check.
#' @return `counts`, invisibly, when it is a two-by-two numeric matrix of
#'   non-negative whole numbers; otherwise an error.
#' @keywords internal
#' @noRd
assert_two_by_two <- function(counts) {
  checkmate::assert_matrix(
    counts,
    mode = "numeric",
    any.missing = FALSE,
    nrows = 2L,
    ncols = 2L,
    .var.name = "counts"
  )
  checkmate::assert_integerish(counts, lower = 0L, .var.name = "counts")
}
