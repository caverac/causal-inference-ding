#' Geometry of the Yule-Simpson paradox in a two-by-two-by-two table
#'
#' Places a two-by-two-by-two table in the plane of Figure 1.2 of Ding (2024,
#' Section 1.3.3), with failures along the horizontal axis and successes along
#' the vertical one. Within the subgroup \eqn{X = x}{X = x}, the treated arm is
#' the vector \eqn{A_x = (n_{10|x}, n_{11|x})}{A_x = (n_10|x, n_11|x)} and the
#' control arm is \eqn{B_x = (n_{00|x}, n_{01|x})}{B_x = (n_00|x, n_01|x)}; the
#' aggregated arms are the sums \eqn{A = A_1 + A_0}{A = A_1 + A_0} and
#' \eqn{B = B_1 + B_0}{B = B_1 + B_0}. The slope of a vector is the odds of
#' success, which increases with the success rate, so comparing two rates is
#' comparing two slopes.
#'
#' The aggregated success rate of an arm is the average of its two subgroup
#' rates weighted by its share of units in each subgroup. Moving the share
#' \eqn{s = \mathrm{pr}(X = 1 \mid Z = 1)}{s = pr(X = 1 | Z = 1)} of the
#' treated arm while keeping every subgroup rate makes the aggregated risk
#' difference linear in \eqn{s}{s}, and `sign_change_at` is where it vanishes.
#'
#' @param counts (`array`) Two-by-two-by-two array of non-negative whole-number
#'   counts indexed as `counts[z, y, x]`, each index running over the levels 1
#'   and 0 in this order, so that every slice `counts[, , x]` is laid out as
#'   for [risk_difference()]. Each arm needs at least one unit in each
#'   subgroup.
#' @return (`list`) With elements
#'   * `treated` and `control` (`list`): for the arm \eqn{Z = 1}{Z = 1} and the
#'     arm \eqn{Z = 0}{Z = 0}, the vectors `subgroups` (`list`), with elements
#'     `1` and `0` for the subgroups \eqn{X = 1}{X = 1} and \eqn{X = 0}{X = 0},
#'     and `aggregated`, each a `list` of `failures` and `successes` (the
#'     class of `counts`) and the success `rate` (`numeric(1)`); and the
#'     `share` (`numeric(1)`) of the arm's units in the subgroup
#'     \eqn{X = 1}{X = 1}.
#'   * `risk_difference` (`list`): the risk differences `1` and `0` within the
#'     subgroups and the `aggregated` one (`numeric(1)`).
#'   * `sign_change_at` (`numeric(1)`): the share of the treated arm at which
#'     the aggregated risk difference vanishes, or `NA` when no share in
#'     \eqn{[0, 1]}{[0, 1]} makes it vanish.
#' @references Ding, P. (2024). *A First Course in Causal Inference*. Chapman
#'   and Hall/CRC. \doi{10.1201/9781003484080}
#' @seealso [risk_difference()], [yule_simpson_examples()]
#' @export
#' @examples
#' counts <- array(c(50L, 6L, 50L, 4L, 1L, 20L, 9L, 80L), dim = c(2L, 2L, 2L))
#' simpson_geometry(counts)$risk_difference
simpson_geometry <- function(counts) {
  assert_two_by_two_by_two(counts)

  # The two-by-two tables of the subgroups X = 1 and X = 0, rows z, columns y.
  tables <- asplit(counts, 3L)
  treated <- arm_geometry(counts[1L, , ])
  control <- arm_geometry(counts[2L, , ])
  rate_one <- treated$subgroups[["1"]]$rate
  rate_zero <- treated$subgroups[["0"]]$rate
  # The treated rate at share s is s * rate_one + (1 - s) * rate_zero; it
  # meets the control rate at a single share unless the two rates are equal.
  crossing <- (control$aggregated$rate - rate_zero) / (rate_one - rate_zero)

  list(
    treated = treated,
    control = control,
    risk_difference = list(
      `1` = risk_difference(tables[[1L]]),
      `0` = risk_difference(tables[[2L]]),
      aggregated = risk_difference(tables[[1L]] + tables[[2L]])
    ),
    sign_change_at = if (is.finite(crossing) && crossing >= 0.0 && crossing <= 1.0) {
      crossing
    } else {
      NA_real_
    }
  )
}

#' Vectors of one arm in the plane of failures and successes
#'
#' @param arm (`matrix`) Two-by-two matrix `arm[y, x]` of the arm's counts,
#'   with rows \eqn{Y = 1}{Y = 1}, \eqn{Y = 0}{Y = 0} and columns
#'   \eqn{X = 1}{X = 1}, \eqn{X = 0}{X = 0}.
#' @return (`list`) The `subgroups`, `aggregated` and `share` elements
#'   described in [simpson_geometry()].
#' @keywords internal
#' @noRd
arm_geometry <- function(arm) {
  list(
    subgroups = list(`1` = outcome_vector(arm[, 1L]), `0` = outcome_vector(arm[, 2L])),
    aggregated = outcome_vector(arm[, 1L] + arm[, 2L]),
    share = sum(arm[, 1L]) / sum(arm)
  )
}

#' A vector of failures and successes with its success rate
#'
#' @param outcomes (`numeric(2)`) Counts of successes and failures, in this
#'   order.
#' @return (`list`) With elements `failures`, `successes` and `rate`.
#' @keywords internal
#' @noRd
outcome_vector <- function(outcomes) {
  successes <- outcomes[[1L]]
  failures <- outcomes[[2L]]

  list(failures = failures, successes = successes, rate = successes / (successes + failures))
}

#' Assert that counts form a two-by-two-by-two table with no empty arm
#'
#' @param counts Object to check.
#' @return `counts`, invisibly, when it is a two-by-two-by-two numeric array of
#'   non-negative whole numbers in which every arm of every subgroup has a
#'   unit; otherwise an error.
#' @keywords internal
#' @noRd
assert_two_by_two_by_two <- function(counts) {
  checkmate::assert_array(counts, mode = "numeric", any.missing = FALSE, d = 3L)
  checkmate::assert_integerish(dim(counts), lower = 2L, upper = 2L, .var.name = "dim(counts)")
  checkmate::assert_integerish(counts, lower = 0L, .var.name = "counts")
  checkmate::assert_true(
    all(apply(counts, c(1L, 3L), sum) > 0L),
    .var.name = "every arm of every subgroup has a unit"
  )
}
