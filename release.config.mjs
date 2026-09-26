/**
 * Versioning and GitHub Releases from Conventional Commits.
 *
 * Nothing is published to a registry. `@semantic-release/npm` runs with
 * `npmPublish: false` only to bump the root package.json, and
 * `@semantic-release/exec` writes the same version into the DESCRIPTION of the
 * R package, so the project and the package always carry one version. The
 * `sed` call assumes GNU sed, which is what the release job runs on.
 */
export default {
  branches: ['main'],
  tagFormat: 'v${version}',
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    ['@semantic-release/changelog', { changelogFile: 'CHANGELOG.md' }],
    ['@semantic-release/npm', { npmPublish: false }],
    [
      '@semantic-release/exec',
      {
        prepareCmd:
          "sed -i -E 's/^Version: .*/Version: ${nextRelease.version}/' packages/causalding/DESCRIPTION"
      }
    ],
    [
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md', 'package.json', 'packages/causalding/DESCRIPTION'],
        message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}'
      }
    ],
    '@semantic-release/github'
  ]
}
