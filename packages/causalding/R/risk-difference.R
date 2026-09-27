#' Risk difference of a two-by-two table
#'
#' Estimates the risk difference
#' \deqn{\mathrm{rd} = \mathrm{pr}(Y = 1 \mid Z = 1) - \mathrm{pr}(Y = 1 \mid Z = 0)}{
#' rd = pr(Y = 1 | Z = 1) - pr(Y = 1 | Z = 0)}
#' from the counts \eqn{n_{zy}}{n_zy} of units with \eqn{Z = z}{Z = z} and
#' \eqn{Y = y}{Y = y}, laid out as in Section 1.2.2 of Ding (2024): the first
#' row holds the units with \eqn{Z = 1}{Z = 1} and the second those with
#' \eqn{Z = 0}{Z = 0}, the first column holds the units with
#' \eqn{Y = 1}{Y = 1} and the second those with \eqn{Y = 0}{Y = 0}. The
#' estimate replaces each conditional probability by a sample proportion,
#' \deqn{\hat{\mathrm{rd}} = \frac{n_{11}}{n_{11} + n_{10}} -
#' \frac{n_{01}}{n_{01} + n_{00}}.}{
#' rd = n_11 / (n_11 + n_10) - n_01 / (n_01 + n_00).}
#'
#' @param counts (`matrix`) Two-by-two matrix of non-negative whole-number
#'   counts, laid out as described above. A two-way `table` qualifies. Both
#'   row totals must be positive, since each is the denominator of a sample
#'   proportion.
#' @return (`numeric(1)`) The estimated risk difference, a number in
#'   \eqn{[-1, 1]}{[-1, 1]}.
#' @references Ding, P. (2024). *A First Course in Causal Inference*.
#'   Chapman and Hall/CRC. \doi{10.1201/9781003484080}
#' @export
#' @examples
#' # Admissions aggregated over departments, Section 1.4 of Ding (2024):
#' # male applicants in the first row, admitted applicants in the first column.
#' risk_difference(matrix(c(1198, 557, 1493, 1278), nrow = 2L))
risk_difference <- function(counts) {
  assert_two_by_two(counts)

  row_totals <- rowSums(counts)
  if (any(row_totals == 0.0)) {
    stop("Each row of `counts` must contain at least one unit.", call. = FALSE)
  }

  counts[1L, 1L] / row_totals[[1L]] - counts[2L, 1L] / row_totals[[2L]]
}
