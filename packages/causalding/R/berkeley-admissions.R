#' Admission rates in the Berkeley graduate admissions data
#'
#' Reproduces the analysis of Section 1.4 of Ding (2024), which revisits the
#' data of Bickel et al. (1975) shipped as [datasets::UCBAdmissions], and
#' extends it with the quantities the documentation site draws. The treatment
#' is the gender of the applicant, with \eqn{Z = 1}{Z = 1} for male and
#' \eqn{Z = 0}{Z = 0} for female applicants, the outcome is admission,
#' \eqn{Y = 1}{Y = 1}, and \eqn{D}{D} is the department applied to.
#'
#' The aggregated risk difference is positive although four of the six
#' departments, department A most strongly, show a negative one: an instance
#' of the Yule-Simpson paradox. The aggregated rate of each group is the
#' average of its department rates weighted by its own distribution over
#' departments, and the two distributions differ: women applied mostly to the
#' departments that admit fewer applicants.
#'
#' Reweighting makes this explicit. Moving the distribution of women over
#' departments a fraction \eqn{t}{t} of the way to that of men, while keeping
#' their rate within each department, makes the aggregated risk difference
#' linear in \eqn{t}{t}. At \eqn{t = 1}{t = 1} both groups share the weights
#' \eqn{\mathrm{pr}(D = d \mid Z = 1)}{pr(D = d | Z = 1)}, and the difference
#' becomes the average of the department differences with those weights. This
#' is arithmetic on the observed rates, not the effect of gender on admission.
#'
#' @return (`list`) With elements
#'   * `aggregated` (`list`): from the table summed over departments, the
#'     number of applicants of each group, `applicants_male` and
#'     `applicants_female` (`integer(1)`), their admission rates `rate_male`
#'     and `rate_female` (`numeric(1)`), and the risk difference
#'     `risk_difference` (`numeric(1)`).
#'   * `standardized` (`list`): with the distribution of women over
#'     departments replaced by that of men, their admission rate `rate_female`
#'     and the risk difference `risk_difference` (`numeric(1)`), and the
#'     fraction `sign_change_at` (`numeric(1)`) of that replacement at which
#'     the aggregated risk difference changes sign.
#'   * `departments` (`data.frame`): one row per department, in the order of
#'     the dataset, with columns `department` (`character`), the counts
#'     `applicants_male`, `admitted_male`, `applicants_female` and
#'     `admitted_female` (`integer`), each group's share of its applicants,
#'     `share_male` and `share_female`, its admission rate, `rate_male` and
#'     `rate_female`, and the risk difference `risk_difference` (`numeric`).
#' @references Bickel, P. J., Hammel, E. A., and O'Connell, J. W. (1975). Sex
#'   bias in graduate admissions: data from Berkeley. *Science*, 187(4175),
#'   398-404. \doi{10.1126/science.187.4175.398}
#'
#'   Ding, P. (2024). *A First Course in Causal Inference*. Chapman and
#'   Hall/CRC. \doi{10.1201/9781003484080}
#' @seealso [risk_difference()], [standardized_rate()]
#' @export
#' @examples
#' berkeley_admissions()$aggregated$risk_difference
berkeley_admissions <- function() {
  admissions <- datasets::UCBAdmissions
  departments <- dimnames(admissions)[["Dept"]]

  # Counts over departments, selected by name so that the result does not
  # depend on the order in which the dataset stores its dimensions.
  counts <- function(outcome, gender) as.integer(admissions[outcome, gender, departments])
  admitted_male <- counts("Admitted", "Male")
  applicants_male <- admitted_male + counts("Rejected", "Male")
  admitted_female <- counts("Admitted", "Female")
  applicants_female <- admitted_female + counts("Rejected", "Female")

  # Two-by-two table with rows Z = 1, Z = 0 and columns Y = 1, Y = 0, the
  # layout risk_difference() expects.
  two_by_two <- function(admitted, applicants) {
    matrix(
      c(
        admitted[[1L]],
        admitted[[2L]],
        applicants[[1L]] - admitted[[1L]],
        applicants[[2L]] - admitted[[2L]]
      ),
      nrow = 2L
    )
  }
  department_differences <- vapply(
    seq_along(departments),
    function(index) {
      risk_difference(two_by_two(
        c(admitted_male[[index]], admitted_female[[index]]),
        c(applicants_male[[index]], applicants_female[[index]])
      ))
    },
    numeric(1L)
  )

  rate_male <- admitted_male / applicants_male
  rate_female <- admitted_female / applicants_female
  share_male <- applicants_male / sum(applicants_male)
  share_female <- applicants_female / sum(applicants_female)

  aggregated_difference <- risk_difference(two_by_two(
    c(sum(admitted_male), sum(admitted_female)),
    c(sum(applicants_male), sum(applicants_female))
  ))
  aggregated_rate_male <- sum(admitted_male) / sum(applicants_male)
  standardized_rate_female <- standardized_rate(rate_female, share_male)
  standardized_difference <- aggregated_rate_male - standardized_rate_female

  list(
    aggregated = list(
      applicants_male = sum(applicants_male),
      applicants_female = sum(applicants_female),
      rate_male = aggregated_rate_male,
      rate_female = sum(admitted_female) / sum(applicants_female),
      risk_difference = aggregated_difference
    ),
    standardized = list(
      rate_female = standardized_rate_female,
      risk_difference = standardized_difference,
      # The difference is linear in the fraction t of the replacement, from
      # the aggregated difference at t = 0 to the standardized one at t = 1.
      sign_change_at = aggregated_difference / (aggregated_difference - standardized_difference)
    ),
    departments = data.frame(
      department = departments,
      applicants_male = applicants_male,
      admitted_male = admitted_male,
      applicants_female = applicants_female,
      admitted_female = admitted_female,
      share_male = share_male,
      share_female = share_female,
      rate_male = rate_male,
      rate_female = rate_female,
      risk_difference = department_differences
    )
  )
}
