tables <- list(
  resume = matrix(c(235L, 157L, 2200L, 2278L), nrow = 2L),
  berkeley = matrix(c(1198L, 557L, 1493L, 1278L), nrow = 2L),
  small = matrix(c(3L, 1L, 1L, 3L), nrow = 2L),
  skewed = matrix(c(7L, 2L, 3L, 11L), nrow = 2L),
  zeros = matrix(c(0L, 5L, 5L, 0L), nrow = 2L)
)

test_that("the null distribution is the hypergeometric law of the first cell", {
  null <- fisher_null_distribution(tables$skewed)

  # The first row holds 10 units and the first column 9, so the cell runs to 9.
  expect_identical(null$k, 0L:9L)
  expect_equal(sum(null$probability), 1.0, tolerance = 1e-15)
  expect_equal(null$probability, stats::dhyper(0L:9L, 9L, 14L, 10L), tolerance = 1e-15)
  expect_equal(10.0^null$log10_probability, null$probability, tolerance = 1e-12)
})

test_that("its support is limited by the row and column totals", {
  null <- fisher_null_distribution(matrix(c(4L, 1L, 0L, 5L), nrow = 2L))

  expect_identical(null$k, 0L:4L)
  expect_identical(fisher_null_distribution(tables$zeros)$k, 0L:5L)
})

test_that("its mean is the count expected from the totals alone", {
  null <- fisher_null_distribution(tables$resume)

  expect_equal(sum(null$k * null$probability), 392.0 * 2435.0 / 4870.0, tolerance = 1e-12)
})

test_that("the p-value matches stats::fisher.test", {
  for (counts in tables) {
    expect_equal(fisher_p_value(counts), stats::fisher.test(counts)$p.value, tolerance = 1e-12)
  }
})

test_that("the p-value is one at the most likely table", {
  expect_equal(fisher_p_value(matrix(c(2L, 2L, 2L, 2L), nrow = 2L)), 1.0, tolerance = 1e-15)
})

test_that("it rejects input that is not a two-by-two table of counts", {
  expect_error(fisher_null_distribution(c(1L, 2L, 3L, 4L)), "Assertion on 'counts' failed")
  expect_error(
    fisher_p_value(matrix(c(1.0, 0.5, 1.0, 1.0), nrow = 2L)),
    "Assertion on 'counts' failed"
  )
})
