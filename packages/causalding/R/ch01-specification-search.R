#' Regressions on every subset of the covariates
#'
#' Fits the linear regression of `outcome` on `treatment` and each of the
#' \eqn{2^K}{2^K} subsets of the \eqn{K}{K} `covariates` by ordinary least
#' squares, as [stats::lm()] does, and reports the coefficient of `treatment`
#' with its usual standard error, confidence interval and two-sided t-test, as
#' `summary(lm(...))` prints them in Section 1.2.1 of Ding (2024). A
#' coefficient is significant when its p-value is below `level`; its sign
#' then makes it positively or negatively significant.
#'
#' @param data (`data.frame`) The data, with the columns named below.
#' @param outcome (`character(1)`) Name of the numeric outcome column.
#' @param treatment (`character(1)`) Name of the numeric treatment column.
#' @param covariates (`character`) Names of the numeric covariate columns,
#'   distinct and other than `outcome` and `treatment`.
#' @param level (`numeric(1)`) Significance level, in \eqn{(0, 1)}{(0, 1)};
#'   the confidence intervals have coverage `1 - level`.
#' @return (`data.frame`) One row per subset, with one `logical` column per
#'   covariate, named after it, that is `TRUE` when the covariate is in the
#'   regression; the coefficient `estimate`, its `std_error`, the confidence
#'   limits `conf_low` and `conf_high`, and the `p_value` (`numeric`); and the
#'   `significance` (`character`), `"positive"`, `"negative"` or `"none"`.
#'   The first row is the regression without covariates and the last the
#'   regression with all of them.
#' @references Ding, P. (2024). *A First Course in Causal Inference*. Chapman
#'   and Hall/CRC. \doi{10.1201/9781003484080}
#' @seealso [lalonde_specifications()]
#' @export
#' @examples
#' data <- data.frame(y = c(1, 3, 2, 5, 4, 6), z = c(0, 1, 0, 1, 0, 1), x = c(1, 2, 2, 3, 1, 3))
#' specification_search(data, "y", "z", "x")
specification_search <- function(data, outcome, treatment, covariates, level = 0.05) {
  checkmate::assert_data_frame(data, min.rows = 1L)
  checkmate::assert_choice(outcome, names(data))
  checkmate::assert_choice(treatment, setdiff(names(data), outcome))
  checkmate::assert_character(covariates, any.missing = FALSE, min.len = 1L, unique = TRUE)
  checkmate::assert_subset(covariates, setdiff(names(data), c(outcome, treatment)))
  checkmate::assert_number(level, lower = 0.0, upper = 1.0)
  checkmate::assert_true(level > 0.0 && level < 1.0, .var.name = "0 < level < 1")
  for (column in c(outcome, treatment, covariates)) {
    checkmate::assert_numeric(data[[column]], any.missing = FALSE, .var.name = column)
  }

  # The full design matrix is built once; each regression takes its columns.
  design <- cbind(intercept = 1.0, as.matrix(data[c(treatment, covariates)]))
  response <- data[[outcome]]

  # Every subset of the covariates, from none to all of them.
  subsets <- expand.grid(rep(list(c(FALSE, TRUE)), length(covariates)))
  names(subsets) <- covariates
  fits <- t(vapply(
    seq_len(nrow(subsets)),
    function(index) {
      included <- covariates[unlist(subsets[index, ], use.names = FALSE)]
      treatment_coefficient(design[, c("intercept", treatment, included)], response, level)
    },
    numeric(5L)
  ))

  significant <- fits[, "p_value"] < level
  significance <- rep("none", nrow(fits))
  significance[significant & fits[, "estimate"] > 0.0] <- "positive"
  significance[significant & fits[, "estimate"] < 0.0] <- "negative"

  cbind(subsets, as.data.frame(fits), significance = significance)
}

#' Coefficient of the treatment in one regression
#'
#' The least squares fit of [stats::lm()], with the standard error, interval
#' and t-test that `summary()` reports for it.
#'
#' @param design (`matrix`) Design matrix whose first column is the intercept
#'   and second the treatment.
#' @param response (`numeric`) The outcome, one value per row of `design`.
#' @inheritParams specification_search
#' @return (`numeric(5)`) Named `estimate`, `std_error`, `conf_low`,
#'   `conf_high` and `p_value`.
#' @keywords internal
#' @noRd
treatment_coefficient <- function(design, response, level) {
  fit <- stats::lm.fit(design, response)
  if (fit$rank < ncol(design)) {
    stop("The covariates are collinear in a regression.", call. = FALSE)
  }

  # With full rank there is no pivoting, so the coefficients keep the order of
  # the columns, and (R'R)^{-1} = (X'X)^{-1} scales the residual variance.
  sigma2 <- sum(fit$residuals^2L) / fit$df.residual
  unscaled <- chol2inv(fit$qr$qr)
  estimate <- fit$coefficients[[2L]]
  std_error <- sqrt(sigma2 * unscaled[2L, 2L])
  margin <- stats::qt(1.0 - level / 2.0, df = fit$df.residual) * std_error

  c(
    estimate = estimate,
    std_error = std_error,
    conf_low = estimate - margin,
    conf_high = estimate + margin,
    p_value = 2.0 * stats::pt(-abs(estimate / std_error), df = fit$df.residual)
  )
}
