#' Specification search on the LaLonde observational data
#'
#' Problem 1.4 of Ding (2024): the regressions of `re78` on `treat` and each of
#' the 1024 subsets of the ten covariates of [cps1re74()], from
#' [specification_search()] at the 5% level, ordered by the estimated
#' coefficient of `treat`.
#'
#' The earnings history, `re74`, `re75`, `u74` and `u75`, settles the sign:
#' every regression without any of it gives a negative coefficient, while most
#' regressions with some of it give a positive one.
#'
#' @return (`list`) With elements
#'   * `covariates` (`character`): the ten covariates, in the order of the
#'     data.
#'   * `level` (`numeric(1)`): the significance level, 0.05.
#'   * `counts` (`list`): the numbers of regressions whose coefficient is
#'     `positive`ly significant, `negative`ly significant, or significant
#'     at `none` of them (`integer(1)`).
#'   * `earnings` (`list`): for the regressions `without` and `with` some of
#'     the earnings history, the number of `specifications`, of `positive`
#'     coefficients and of `negative`ly significant ones (`integer(1)`), and
#'     the `lowest` and `highest` estimates (`numeric(1)`).
#'   * `specifications` (`data.frame`): one row per regression, by increasing
#'     estimate, with the columns of [specification_search()] other than the
#'     covariate indicators, which are gathered into `included`, a list of
#'     `logical` vectors aligned with `covariates`.
#' @references Ding, P. (2024). *A First Course in Causal Inference*. Chapman
#'   and Hall/CRC. \doi{10.1201/9781003484080}
#' @seealso [cps1re74()], [specification_search()]
#' @export
#' @examples
#' \donttest{
#' lalonde_specifications()$counts
#' }
lalonde_specifications <- function() {
  cps <- cps1re74()
  covariates <- setdiff(names(cps), c("treat", "re78"))
  fits <- specification_search(cps, "re78", "treat", covariates)
  fits <- fits[order(fits$estimate), ]

  indicators <- as.matrix(fits[covariates])
  earnings <- rowSums(indicators[, c("re74", "re75", "u74", "u75")]) > 0L
  count <- function(rows, significance) sum(fits$significance[rows] == significance)
  group <- function(rows) {
    list(
      specifications = sum(rows),
      positive = sum(fits$estimate[rows] > 0.0),
      negative = count(rows, "negative"),
      lowest = min(fits$estimate[rows]),
      highest = max(fits$estimate[rows])
    )
  }

  specifications <- fits[setdiff(names(fits), covariates)]
  rownames(specifications) <- NULL
  specifications$included <- lapply(seq_len(nrow(indicators)), function(row) {
    unname(indicators[row, ])
  })

  list(
    covariates = covariates,
    level = 0.05,
    counts = list(
      positive = count(TRUE, "positive"),
      negative = count(TRUE, "negative"),
      none = count(TRUE, "none")
    ),
    earnings = list(without = group(!earnings), with = group(earnings)),
    specifications = specifications
  )
}
