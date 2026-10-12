#' Callbacks by perceived race, separately for female and male names
#'
#' Problem 1.5 of Ding (2024): the analysis of Example 1.1 repeated within the
#' resumes with female names and within those with male names. In each group,
#' with \eqn{Z = 1}{Z = 1} for a White-sounding name and \eqn{Y = 1}{Y = 1} for
#' a callback, it reports the risk difference with its usual standard error
#' \eqn{\sqrt{\hat p_1 (1 - \hat p_1) / n_1 + \hat p_0 (1 - \hat p_0) / n_0}}{
#' sqrt(p1 (1 - p1) / n1 + p0 (1 - p0) / n0)}, and the p-value of Fisher's
#' exact test. The two groups share no resume, so the difference of their risk
#' differences has the standard error of the two combined, and is compared with
#' zero by a z-test.
#'
#' @return (`list`) With elements
#'   * `groups` (`data.frame`): one row each for `"female"` and `"male"`
#'     names and for `"all"` of them, with columns `sex` (`character`), the
#'     resumes and callbacks of each race, `resumes_white`, `callbacks_white`,
#'     `resumes_black` and `callbacks_black` (`integer`), the callback rates
#'     `rate_white` and `rate_black`, the `risk_difference`, its `std_error`
#'     and the `p_value` of Fisher's exact test (`numeric`).
#'   * `difference` (`list`): the female minus the male risk difference,
#'     `estimate`, its `std_error` and the two-sided `p_value` of the z-test
#'     (`numeric(1)`).
#' @references Ding, P. (2024). *A First Course in Causal Inference*. Chapman
#'   and Hall/CRC. \doi{10.1201/9781003484080}
#' @seealso [resume_experiment()], [risk_difference()], [fisher_p_value()]
#' @export
#' @examples
#' resume_by_sex()$groups[c("sex", "risk_difference", "p_value")]
resume_by_sex <- function() {
  resumes <- resume_experiment()
  group_row <- function(sex, rows) {
    white <- rows & resumes$race == "white"
    black <- rows & resumes$race == "black"
    # Rows Z = 1, Z = 0 and columns Y = 1, Y = 0, as risk_difference() expects.
    counts <- matrix(
      c(
        sum(resumes$call[white]),
        sum(resumes$call[black]),
        sum(1L - resumes$call[white]),
        sum(1L - resumes$call[black])
      ),
      nrow = 2L
    )
    rate_white <- mean(resumes$call[white])
    rate_black <- mean(resumes$call[black])
    data.frame(
      sex = sex,
      resumes_white = sum(white),
      callbacks_white = counts[1L, 1L],
      resumes_black = sum(black),
      callbacks_black = counts[2L, 1L],
      rate_white = rate_white,
      rate_black = rate_black,
      risk_difference = risk_difference(counts),
      std_error = sqrt(
        rate_white * (1.0 - rate_white) / sum(white) + rate_black * (1.0 - rate_black) / sum(black)
      ),
      p_value = fisher_p_value(counts)
    )
  }

  groups <- rbind(
    group_row("female", resumes$sex == "female"),
    group_row("male", resumes$sex == "male"),
    group_row("all", rep(TRUE, nrow(resumes)))
  )
  estimate <- groups$risk_difference[[1L]] - groups$risk_difference[[2L]]
  std_error <- sqrt(groups$std_error[[1L]]^2L + groups$std_error[[2L]]^2L)

  list(
    groups = groups,
    difference = list(
      estimate = estimate,
      std_error = std_error,
      p_value = 2.0 * stats::pnorm(-abs(estimate / std_error))
    )
  )
}
