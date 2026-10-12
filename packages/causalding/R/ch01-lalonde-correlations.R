#' Correlations behind the specification search on the LaLonde data
#'
#' Explains the sign changes of [lalonde_specifications()] through the
#' correlations of [cps1re74()]. Write \eqn{Y}{Y} for `re78`, \eqn{Z}{Z} for
#' `treat` and \eqn{X}{X} for one covariate. Adding \eqn{X}{X} alone to the
#' regression of \eqn{Y}{Y} on \eqn{Z}{Z} changes the coefficient of
#' \eqn{Z}{Z} by
#' \deqn{\Delta = -K \frac{\rho_{ZX} \rho_{YX|Z}}{\sqrt{1 - \rho_{ZX}^2}},
#'   \qquad K = \frac{\mathrm{sd}(Y)}{\mathrm{sd}(Z)} \sqrt{1 - \rho_{YZ}^2},}{
#'   Delta = -K rho_ZX rho_YX|Z / sqrt(1 - rho_ZX^2), K = sd(Y) / sd(Z)
#'   sqrt(1 - rho_YZ^2),}
#' with sample correlations and the partial correlation of
#' [partial_correlation()]. This is the omitted variable formula
#' \eqn{\Delta = -\gamma \delta}{Delta = -gamma delta}, with \eqn{\gamma}{gamma}
#' the coefficient of \eqn{X}{X} in the regression of \eqn{Y}{Y} on
#' \eqn{Z}{Z} and \eqn{X}{X}, and \eqn{\delta}{delta} that of \eqn{Z}{Z} in the
#' regression of \eqn{X}{X} on \eqn{Z}{Z}, written in correlations.
#' \eqn{K}{K} is the same for every covariate, so the change is positive
#' exactly when \eqn{\rho_{ZX}}{rho_ZX} and \eqn{\rho_{YX|Z}}{rho_YX|Z} have
#' opposite signs.
#'
#' @return (`list`) With elements
#'   * `variables` (`character`): the outcome `re78`, the treatment `treat`,
#'     the earnings history and the demographic covariates, in this order.
#'   * `groups` (`character`): for each variable, `"outcome"`,
#'     `"treatment"`, `"earnings"` or `"demographics"`.
#'   * `correlations` (`matrix`): the sample correlations of the variables,
#'     in their order.
#'   * `baseline` (`numeric(1)`): the coefficient of `treat` without
#'     covariates.
#'   * `shift_scale` (`numeric(1)`): the constant \eqn{K}{K} above.
#'   * `covariates` (`data.frame`): one row per covariate, in the order of
#'     `variables`, with its `name` and `group` (`character`), the
#'     correlations `rho_zx` with the treatment and `rho_yx` with the outcome,
#'     the partial correlation `rho_yx_z` with the outcome given the
#'     treatment, the coefficient `estimate` of `treat` in the regression on
#'     `treat` and the covariate, and its `shift` from `baseline`
#'     (`numeric`).
#' @references Ding, P. (2024). *A First Course in Causal Inference*. Chapman
#'   and Hall/CRC. \doi{10.1201/9781003484080}
#' @seealso [lalonde_specifications()], [partial_correlation()]
#' @export
#' @examples
#' lalonde_correlations()$covariates[c("name", "shift")]
lalonde_correlations <- function() {
  cps <- cps1re74()
  earnings <- c("re74", "re75", "u74", "u75")
  demographics <- c("age", "educ", "black", "hispan", "married", "nodegree")
  variables <- c("re78", "treat", earnings, demographics)
  correlations <- stats::cor(cps[variables])

  rho_yz <- correlations[["re78", "treat"]]
  baseline <- treatment_coefficient(cbind(1.0, cps$treat), cps$re78, 0.05)[["estimate"]]
  covariates <- c(earnings, demographics)
  covariate_rows <- lapply(covariates, function(name) {
    rho_zx <- correlations[["treat", name]]
    rho_yx <- correlations[["re78", name]]
    design <- cbind(1.0, cps$treat, cps[[name]])
    estimate <- treatment_coefficient(design, cps$re78, 0.05)[["estimate"]]
    data.frame(
      name = name,
      group = if (name %in% earnings) "earnings" else "demographics",
      rho_zx = rho_zx,
      rho_yx = rho_yx,
      rho_yx_z = partial_correlation(rho_yx, rho_yz, rho_zx),
      estimate = estimate,
      shift = estimate - baseline
    )
  })

  list(
    variables = variables,
    groups = c("outcome", "treatment", rep("earnings", 4L), rep("demographics", 6L)),
    correlations = unname(correlations),
    baseline = baseline,
    shift_scale = stats::sd(cps$re78) / stats::sd(cps$treat) * sqrt(1.0 - rho_yz^2L),
    covariates = do.call(rbind, covariate_rows)
  )
}
