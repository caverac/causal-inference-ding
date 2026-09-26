test_that("the aggregated difference matches Ding (2024, Section 1.4)", {
  expect_identical(signif(berkeley_admissions()$aggregated$risk_difference, 7L), 0.1416454)
})

test_that("the department differences match Ding (2024, Section 1.4)", {
  departments <- berkeley_admissions()$departments

  expect_identical(departments$department, c("A", "B", "C", "D", "E", "F"))
  expect_identical(
    round(departments$risk_difference, 2L),
    c(-0.20, -0.05, 0.03, -0.02, 0.04, -0.01)
  )
})

test_that("the counts reproduce the raw data printed in Ding (2024, Section 1.4)", {
  departments <- berkeley_admissions()$departments

  expect_identical(departments$admitted_male[[1L]], 512L)
  expect_identical(departments$applicants_male[[1L]], 512L + 313L)
  expect_identical(departments$admitted_female[[1L]], 89L)
  expect_identical(departments$applicants_female[[1L]], 89L + 19L)
  expect_identical(
    sum(departments$applicants_male, departments$applicants_female),
    as.integer(sum(datasets::UCBAdmissions))
  )
})

test_that("the aggregated counts and rates match the table summed over departments", {
  aggregated <- berkeley_admissions()$aggregated

  expect_identical(aggregated$applicants_male, 1198L + 1493L)
  expect_identical(aggregated$applicants_female, 557L + 1278L)
  expect_identical(aggregated$rate_male, 1198L / 2691L)
  expect_identical(aggregated$rate_female, 557L / 1835L)
  expect_identical(aggregated$risk_difference, aggregated$rate_male - aggregated$rate_female)
})

test_that("each group's shares form a distribution over departments", {
  departments <- berkeley_admissions()$departments

  expect_equal(sum(departments$share_male), 1.0, tolerance = 1e-15)
  expect_equal(sum(departments$share_female), 1.0, tolerance = 1e-15)
})

test_that("each aggregated rate averages the department rates with the group's own shares", {
  result <- berkeley_admissions()
  departments <- result$departments

  expect_equal(
    standardized_rate(departments$rate_male, departments$share_male),
    result$aggregated$rate_male,
    tolerance = 1e-15
  )
  expect_equal(
    standardized_rate(departments$rate_female, departments$share_female),
    result$aggregated$rate_female,
    tolerance = 1e-15
  )
})

test_that("the aggregated difference is positive while most departments are negative", {
  result <- berkeley_admissions()
  differences <- result$departments$risk_difference

  expect_gt(result$aggregated$risk_difference, 0.0)
  expect_identical(result$departments$department[differences < 0.0], c("A", "B", "D", "F"))
  expect_identical(result$departments$department[[which.min(differences)]], "A")
})

test_that("with the shares of men the difference averages the department differences", {
  result <- berkeley_admissions()
  departments <- result$departments

  expect_equal(
    result$standardized$risk_difference,
    sum(departments$share_male * departments$risk_difference),
    tolerance = 1e-15
  )
  expect_lt(result$standardized$risk_difference, 0.0)
})

test_that("the difference vanishes where the reweighting changes its sign", {
  result <- berkeley_admissions()
  departments <- result$departments
  at <- result$standardized$sign_change_at
  shares <- (1.0 - at) * departments$share_female + at * departments$share_male

  expect_gt(at, 0.0)
  expect_lt(at, 1.0)
  expect_equal(
    result$aggregated$rate_male - standardized_rate(departments$rate_female, shares),
    0.0,
    tolerance = 1e-15
  )
})
