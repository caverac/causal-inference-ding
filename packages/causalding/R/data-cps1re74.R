#' LaLonde observational data used by Hainmueller (2012)
#'
#' Reads `cps1re74.csv`, the data of Section 1.2.1 and Problem 1.4 of Ding
#' (2024): the 185 participants in a job training program (`treat = 1`) and
#' 15,992 people from a population survey (`treat = 0`), the observational
#' counterpart of the experiment analyzed in Section 4.5.3 of the book, whose
#' treated units are the same 185 participants. As in Section 1.2.1, the indicators of zero
#' earnings in 1974 and 1975, `u74` and `u75`, are added to the file's columns.
#'
#' The file is copied unchanged from the book's replication data on the Harvard
#' Dataverse, released under CC0 1.0.
#'
#' @return (`data.frame`) One row per person, with the treatment `treat`
#'   (`integer`), the covariates `age`, `educ` (years of schooling), `black`,
#'   `hispan`, `married`, `nodegree` (`integer`), the earnings `re74` and
#'   `re75` (`numeric`, 1978 US dollars), the outcome `re78` (`numeric`, 1978
#'   US dollars), and the indicators `u74` and `u75` (`numeric`) of
#'   `re74 == 0` and `re75 == 0`.
#' @references Ding, P. (2024). *A First Course in Causal Inference*. Chapman
#'   and Hall/CRC. \doi{10.1201/9781003484080}
#'
#'   Ding, P. (2023). Replication data for: A first course in causal
#'   inference (Version 4.0). Harvard Dataverse. \doi{10.7910/DVN/ZX3VEV}
#'
#'   Hainmueller, J. (2012). Entropy balancing for causal effects: A
#'   multivariate reweighting method to produce balanced samples in
#'   observational studies. *Political Analysis*, 20(1), 25-46.
#'   \doi{10.1093/pan/mpr025}
#' @seealso [specification_search()], [lalonde_specifications()]
#' @export
#' @examples
#' table(cps1re74()$treat)
cps1re74 <- function() {
  path <- system.file("extdata", "cps1re74.csv", package = "causalding", mustWork = TRUE)
  cps <- utils::read.table(path, header = TRUE)
  cps$u74 <- as.numeric(cps$re74 == 0.0)
  cps$u75 <- as.numeric(cps$re75 == 0.0)

  cps
}
