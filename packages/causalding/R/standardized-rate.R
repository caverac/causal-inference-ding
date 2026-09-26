#' Rate standardized to a distribution over strata
#'
#' Averages the rates \eqn{r_d}{r_d} of the strata \eqn{d}{d} with the weights
#' \eqn{w_d}{w_d},
#' \deqn{\sum_d w_d r_d.}{sum_d w_d r_d.}
#' When the weights are a group's own distribution over the strata,
#' \eqn{w_d = \mathrm{pr}(D = d \mid Z = z)}{w_d = pr(D = d | Z = z)}, and the
#' rates are its rates within them,
#' \eqn{r_d = \mathrm{pr}(Y = 1 \mid Z = z, D = d)}{r_d = pr(Y = 1 | Z = z, D = d)},
#' the law of total probability makes the average the group's aggregated rate
#' \eqn{\mathrm{pr}(Y = 1 \mid Z = z)}{pr(Y = 1 | Z = z)}. Weights taken from
#' another group reweight the same rates to that group's distribution.
#'
#' @param rates (`numeric`) Rates in \eqn{[0, 1]}{[0, 1]}, one per stratum.
#' @param weights (`numeric`) Non-negative weights, one per stratum, summing to
#'   one.
#' @return (`numeric(1)`) The weighted average of the rates, in
#'   \eqn{[0, 1]}{[0, 1]}.
#' @export
#' @examples
#' # Two strata, weighted three to one.
#' standardized_rate(c(0.2, 0.6), c(0.75, 0.25))
standardized_rate <- function(rates, weights) {
  checkmate::assert_numeric(rates, lower = 0.0, upper = 1.0, any.missing = FALSE, min.len = 1L)
  checkmate::assert_numeric(weights, lower = 0.0, any.missing = FALSE, len = length(rates))
  if (abs(sum(weights) - 1.0) > sqrt(.Machine$double.eps)) {
    stop("`weights` must sum to one.", call. = FALSE)
  }

  sum(weights * rates)
}
