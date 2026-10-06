test_that("it reproduces the table of Example 1.1", {
  resumes <- resume_experiment()
  counts <- table(resumes$race, resumes$call)

  expect_identical(nrow(resumes), 4870L)
  expect_identical(as.vector(counts["black", ]), c(2278L, 157L))
  expect_identical(as.vector(counts["white", ]), c(2200L, 235L))
})

test_that("it holds female and male names of both races", {
  resumes <- resume_experiment()

  expect_named(resumes, c("firstname", "sex", "race", "call"))
  expect_identical(sort(unique(resumes$sex)), c("female", "male"))
  expect_identical(sort(unique(resumes$race)), c("black", "white"))
  expect_identical(sort(unique(resumes$call)), c(0L, 1L))
})
