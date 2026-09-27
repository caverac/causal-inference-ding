test_that("the counts match the table of Example 1.1 in Ding (2024)", {
  result <- resume_callbacks()

  expect_identical(result$resumes, list(white = 2200L + 235L, black = 2278L + 157L))
  expect_identical(result$callbacks, list(white = 235L, black = 157L))
})

test_that("the p-value matches the output printed in Example 1.1", {
  expect_identical(signif(resume_callbacks()$p_value$two_sided, 4L), 4.759e-05)
})

test_that("the null distribution is centred on half of the callbacks", {
  null <- resume_callbacks()$null

  expect_equal(null$expected, 196.0, tolerance = 1e-12)
  expect_equal(
    null$sd^2L,
    2435.0 * (392.0 / 4870.0) * (4478.0 / 4870.0) * (2435.0 / 4869.0),
    tolerance = 1e-12
  )
})

test_that("the two tails are equal and add up to the two-sided p-value", {
  p_value <- resume_callbacks()$p_value

  expect_equal(p_value$lower, p_value$upper, tolerance = 1e-12)
  expect_equal(p_value$upper + p_value$lower, p_value$two_sided, tolerance = 1e-12)
})
