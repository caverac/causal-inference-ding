#' Two instances of the Yule-Simpson paradox
#'
#' The tables of the solution to Problem 1.2 of Ding (2024), each placed in
#' the plane of Figure 1.2 of the book by [simpson_geometry()].
#'
#' * `postcard`: a constructed example. A postcard (\eqn{Z = 1}{Z = 1}) is
#'   mailed to 110 customers and withheld from 110 others, \eqn{Y = 1}{Y = 1}
#'   when the customer buys, and \eqn{X = 1}{X = 1} for the high and
#'   \eqn{X = 0}{X = 0} for the low segment of a purchase propensity model.
#'   The postcard lowers the purchase rate by 0.1 in both segments, and
#'   raises it in the aggregate.
#' * `ramp_up`: the online experiment of Table 1 of Crook et al. (2009), in
#'   which the treatment (\eqn{Z = 1}{Z = 1}) receives 1% of the visitors on
#'   Friday (\eqn{X = 1}{X = 1}) and 50% on Saturday (\eqn{X = 0}{X = 0}), and
#'   \eqn{Y = 1}{Y = 1} is a conversion. The treatment converts better on each
#'   day and worse over the two days.
#'
#' @return (`list`) With elements `postcard` and `ramp_up`, each as returned
#'   by [simpson_geometry()].
#' @references Crook, T., Frasca, B., Kohavi, R., and Longbotham, R. (2009).
#'   Seven pitfalls to avoid when running controlled experiments on the web.
#'   *Proceedings of the 15th ACM SIGKDD International Conference on Knowledge
#'   Discovery and Data Mining*, 1105-1114. \doi{10.1145/1557019.1557139}
#'
#'   Ding, P. (2024). *A First Course in Causal Inference*. Chapman and
#'   Hall/CRC. \doi{10.1201/9781003484080}
#' @seealso [simpson_geometry()]
#' @export
#' @examples
#' yule_simpson_examples()$ramp_up$risk_difference
yule_simpson_examples <- function() {
  # Counts are listed as counts[z, y, x] in column-major order: for X = 1, the
  # successes of Z = 1 and Z = 0, then their failures; the same for X = 0.
  postcard <- array(c(50L, 6L, 50L, 4L, 1L, 20L, 9L, 80L), dim = c(2L, 2L, 2L))
  ramp_up <- array(
    c(230L, 20000L, 9770L, 970000L, 6000L, 5000L, 494000L, 495000L),
    dim = c(2L, 2L, 2L)
  )

  list(postcard = simpson_geometry(postcard), ramp_up = simpson_geometry(ramp_up))
}
