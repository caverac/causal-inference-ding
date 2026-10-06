# One search for the whole file: it fits 1024 regressions.
result <- lalonde_specifications()
specifications <- result$specifications

test_that("it searches the ten covariates of Section 1.2.1", {
  expect_identical(
    result$covariates,
    c("age", "educ", "black", "hispan", "married", "nodegree", "re74", "re75", "u74", "u75")
  )
  expect_identical(nrow(specifications), 1024L)
  expect_identical(lengths(specifications$included), rep(10L, 1024L))
  expect_identical(anyDuplicated(specifications$included), 0L)
})

test_that("the regressions are ordered by their estimate", {
  expect_false(is.unsorted(specifications$estimate))
})

test_that("it counts 260 positive, 80 negative and 684 insignificant coefficients", {
  expect_identical(result$counts, list(positive = 260L, negative = 80L, none = 684L))
  expect_identical(
    unlist(result$counts, use.names = FALSE),
    as.vector(table(factor(specifications$significance, c("positive", "negative", "none"))))
  )
})

test_that("it includes the two regressions of Section 1.2.1", {
  none <- vapply(specifications$included, function(included) !any(included), logical(1L))
  all <- vapply(specifications$included, all, logical(1L))

  expect_identical(round(specifications$estimate[none], 3L), -8506.495)
  expect_identical(specifications$significance[none], "negative")
  expect_identical(round(specifications$estimate[all], 3L), 1067.546)
  expect_identical(round(specifications$p_value[all], 3L), 0.054)
  expect_identical(specifications$significance[all], "none")
})

test_that("without the earnings history every coefficient is negatively significant", {
  counts <- c("specifications", "positive", "negative")

  expect_identical(
    result$earnings$without[counts],
    list(specifications = 64L, positive = 0L, negative = 64L)
  )
  expect_identical(
    result$earnings$with[counts],
    list(specifications = 960L, positive = 809L, negative = 16L)
  )
})

test_that("the estimates of each group span the ranges quoted in the solution", {
  rounded <- function(group) round(c(group$lowest, group$highest))

  expect_identical(rounded(result$earnings$without), c(-8526.0, -2882.0))
  expect_identical(rounded(result$earnings$with), c(-2682.0, 2954.0))
  expect_identical(result$earnings$without$lowest, min(specifications$estimate))
  expect_identical(result$earnings$with$highest, max(specifications$estimate))
})
