#' Mean of a truncated Normal random variable
#'
#' For \eqn{X \sim N(\mu, \sigma^2)}{X ~ N(mu, sigma^2)} and
#' \eqn{a < b}{a < b},
#' \deqn{E(X \mid a < X < b) = \mu - \sigma \frac{\phi(\beta) - \phi(\alpha)}
#'   {\Phi(\beta) - \Phi(\alpha)}, \quad \alpha = \frac{a - \mu}{\sigma}, \quad
#'   \beta = \frac{b - \mu}{\sigma},}{E(X | a < X < b) = mu - sigma (phi(beta) -
#'   phi(alpha)) / (Phi(beta) - Phi(alpha)), alpha = (a - mu) / sigma, beta =
#'   (b - mu) / sigma,}
#' the formula of the remark to Problem 2.1 of Ding (2024), with
#' \eqn{\phi}{phi} and \eqn{\Phi}{Phi} the standard Normal density and
#' distribution function. Either limit may be infinite.
#'
#' @param mu (`numeric(1)`) Mean of the untruncated variable.
#' @param sigma (`numeric(1)`) Its standard deviation, positive.
#' @param lower,upper (`numeric(1)`) The limits \eqn{a < b}{a < b}, possibly
#'   `-Inf` and `Inf`.
#' @return (`numeric(1)`) The conditional mean, which lies in
#'   \eqn{(a, b)}{(a, b)}.
#' @references Ding, P. (2024). *A First Course in Causal Inference*. Chapman
#'   and Hall/CRC. \doi{10.1201/9781003484080}
#' @export
#' @examples
#' # The mean of a standard Normal variable above 0.5.
#' truncated_normal_mean(0, 1, 0.5, Inf)
truncated_normal_mean <- function(mu, sigma, lower, upper) {
  checkmate::assert_number(mu, finite = TRUE)
  checkmate::assert_number(sigma, lower = 0.0, finite = TRUE)
  checkmate::assert_true(sigma > 0.0, .var.name = "sigma > 0")
  checkmate::assert_number(lower)
  checkmate::assert_number(upper)
  checkmate::assert_true(lower < upper, .var.name = "lower < upper")

  standardized_lower <- (lower - mu) / sigma
  standardized_upper <- (upper - mu) / sigma
  density_difference <- stats::dnorm(standardized_upper) - stats::dnorm(standardized_lower)
  probability <- stats::pnorm(standardized_upper) - stats::pnorm(standardized_lower)

  mu - sigma * density_difference / probability
}
