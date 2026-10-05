#' Partial correlation from three correlations
#'
#' The correlation of \eqn{A}{A} and \eqn{B}{B} given \eqn{C}{C},
#' \deqn{\rho_{AB|C} = \frac{\rho_{AB} - \rho_{AC} \rho_{BC}}
#'   {\sqrt{1 - \rho_{AC}^2} \sqrt{1 - \rho_{BC}^2}},}{rho_AB|C = (rho_AB -
#'   rho_AC rho_BC) / sqrt((1 - rho_AC^2) (1 - rho_BC^2)),}
#' the formula of Problem 1.3 of Ding (2024). For a Normal vector it is the
#' correlation in the conditional distribution of \eqn{(A, B)}{(A, B)} given
#' \eqn{C}{C}. For sample correlations it is, for any data, the correlation of
#' the residuals of \eqn{A}{A} and of \eqn{B}{B} after their least squares
#' regressions on \eqn{C}{C}.
#'
#' @param rho_ab,rho_ac,rho_bc (`numeric(1)`) The correlations of the pairs
#'   \eqn{(A, B)}{(A, B)}, \eqn{(A, C)}{(A, C)} and \eqn{(B, C)}{(B, C)}, in
#'   \eqn{[-1, 1]}{[-1, 1]}; `rho_ac` and `rho_bc` strictly inside it.
#' @return (`numeric(1)`) The partial correlation \eqn{\rho_{AB|C}}{rho_AB|C}.
#' @references Ding, P. (2024). *A First Course in Causal Inference*. Chapman
#'   and Hall/CRC. \doi{10.1201/9781003484080}
#' @export
#' @examples
#' # The numerical example of Problem 1.3: positive marginally, negative given C.
#' partial_correlation(0.2, 0.6, 0.6)
partial_correlation <- function(rho_ab, rho_ac, rho_bc) {
  checkmate::assert_number(rho_ab, lower = -1.0, upper = 1.0)
  checkmate::assert_number(rho_ac, lower = -1.0, upper = 1.0)
  checkmate::assert_number(rho_bc, lower = -1.0, upper = 1.0)
  checkmate::assert_true(
    abs(rho_ac) < 1.0 && abs(rho_bc) < 1.0,
    .var.name = "|rho_ac|, |rho_bc| < 1"
  )

  (rho_ab - rho_ac * rho_bc) / sqrt((1.0 - rho_ac^2L) * (1.0 - rho_bc^2L))
}
