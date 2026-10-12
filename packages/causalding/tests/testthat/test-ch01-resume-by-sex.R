result <- resume_by_sex()
groups <- result$groups

test_that("the groups count the resumes and callbacks of the solution's table", {
  expect_identical(groups$sex, c("female", "male", "all"))
  expect_identical(groups$resumes_white, c(1860L, 575L, 2435L))
  expect_identical(groups$callbacks_white, c(184L, 51L, 235L))
  expect_identical(groups$resumes_black, c(1886L, 549L, 2435L))
  expect_identical(groups$callbacks_black, c(125L, 32L, 157L))
})

test_that("the rates and differences round to the solution's table", {
  percent <- function(x) round(100.0 * x, 2L)

  expect_identical(percent(groups$rate_white), c(9.89, 8.87, 9.65))
  expect_identical(percent(groups$rate_black), c(6.63, 5.83, 6.45))
  expect_identical(percent(groups$risk_difference), c(3.26, 3.04, 3.20))
  expect_identical(percent(groups$std_error), c(0.90, 1.55, 0.78))
  expect_identical(signif(groups$p_value, 2L), c(0.00029, 0.053, 4.8e-05))
  expect_identical(round(groups$rate_white / groups$rate_black, 1L), c(1.5, 1.5, 1.5))
})

test_that("the p-values are those of fisher.test", {
  resumes <- resume_experiment()
  for (sex in c("female", "male")) {
    rows <- resumes[resumes$sex == sex, ]
    expected <- stats::fisher.test(table(rows$race, rows$call))$p.value

    expect_equal(groups$p_value[groups$sex == sex], expected, tolerance = 1e-12)
  }
})

test_that("the two risk differences do not differ significantly", {
  difference <- result$difference

  expect_identical(
    difference$estimate,
    groups$risk_difference[[1L]] - groups$risk_difference[[2L]]
  )
  expect_identical(round(100.0 * c(difference$estimate, difference$std_error), 2L), c(0.22, 1.79))
  expect_identical(round(difference$p_value, 2L), 0.9)
})
