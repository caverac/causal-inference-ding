#' Resumes of the experiment of Bertrand and Mullainathan (2004)
#'
#' Reads `resume.csv`, the data of Example 1.1 and Problem 1.5 of Ding
#' (2024): one row per fictitious resume sent to a help-wanted ad in Boston or
#' Chicago, with the first name it carried, whether that name sounds female or
#' male and White or Black, and whether the employer called back. The file is
#' copied unchanged from the book's replication data on the Harvard Dataverse,
#' released under CC0 1.0.
#'
#' @return (`data.frame`) One row per resume, with columns `firstname`,
#'   `sex` (`"female"` or `"male"`) and `race` (`"white"` or `"black"`)
#'   (`character`), and `call` (`integer`), 1 for a callback.
#' @references Bertrand, M. and Mullainathan, S. (2004). Are Emily and Greg
#'   more employable than Lakisha and Jamal? A field experiment on labor market
#'   discrimination. *American Economic Review*, 94(4), 991-1013.
#'   \doi{10.1257/0002828042002561}
#'
#'   Ding, P. (2023). Replication data for: A first course in causal
#'   inference (Version 4.0). Harvard Dataverse. \doi{10.7910/DVN/ZX3VEV}
#'
#'   Ding, P. (2024). *A First Course in Causal Inference*. Chapman and
#'   Hall/CRC. \doi{10.1201/9781003484080}
#' @seealso [resume_by_sex()], [resume_callbacks()]
#' @export
#' @examples
#' table(resume_experiment()$race, resume_experiment()$call)
resume_experiment <- function() {
  path <- system.file("extdata", "resume.csv", package = "causalding", mustWork = TRUE)
  utils::read.csv(path)
}
