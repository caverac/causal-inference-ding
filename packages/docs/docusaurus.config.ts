import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'

import type * as Preset from '@docusaurus/preset-classic'
import type { Config } from '@docusaurus/types'
import { themes as prismThemes } from 'prism-react-renderer'
import rehypeKatex from 'rehype-katex'
import remarkMath from 'remark-math'

import remarkTocMath from '#remark/tocMath'

const GITHUB_URL = 'https://github.com/caverac/causal-inference-ding'
const BADGE_COLOR = '4a5568'

type Stylesheet = NonNullable<Config['stylesheets']>[number]

/**
 * Reads and validates the `version` field of a package manifest.
 */
function readVersion(manifestPath: string): string {
  const manifest: unknown = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))

  if (
    typeof manifest !== 'object' ||
    manifest === null ||
    !('version' in manifest) ||
    typeof manifest.version !== 'string'
  ) {
    throw new Error(`No "version" field found in ${manifestPath}`)
  }

  return manifest.version
}

/**
 * Stylesheet entry for KaTeX, derived from the copy in `node_modules` rather
 * than written out by hand.
 *
 * The stylesheet has to match the KaTeX that `rehype-katex` and the table of
 * contents render with, and its integrity hash has to match the stylesheet, so
 * pinning either by hand invites a silent mismatch: a stale hash makes browsers
 * refuse the file and every formula on the site loses its layout. Taking the
 * version and the hash from the installed package keeps all three in step, and
 * upgrading KaTeX becomes a dependency bump on its own.
 */
function katexStylesheet(): Stylesheet {
  const packageDir = path.dirname(require.resolve('katex/package.json'))
  const version = readVersion(path.join(packageDir, 'package.json'))
  const css = fs.readFileSync(path.join(packageDir, 'dist', 'katex.min.css'))

  return {
    href: `https://cdn.jsdelivr.net/npm/katex@${version}/dist/katex.min.css`,
    type: 'text/css',
    integrity: `sha384-${crypto.createHash('sha384').update(css).digest('base64')}`,
    crossorigin: 'anonymous'
  }
}

/**
 * Escapes a value for a shields.io path segment, where a hyphen separates the
 * label from the message and an underscore stands for a space. Both characters
 * are doubled to be taken literally, which matters for prerelease versions such
 * as `1.0.0-rc.1`.
 */
function escapeBadgeField(value: string): string {
  return value.replace(/-/g, '--').replace(/_/g, '__')
}

/**
 * Version of the project as a whole, read from the workspace root manifest,
 * which is what semantic-release bumps on each release alongside the
 * DESCRIPTION of the R package.
 */
const projectVersion = readVersion(path.resolve(__dirname, '../../package.json'))

/**
 * Version badge rendered in the navbar, on every page, linking to the releases
 * on GitHub. The navbar takes raw HTML rather than a component, so the markup
 * is assembled here where the version is already known.
 */
const versionBadgeHtml =
  `<a class="navbar-version-badge" href="${GITHUB_URL}/releases"` +
  ` target="_blank" rel="noopener noreferrer" title="Project version ${projectVersion}">` +
  `<img src="https://img.shields.io/badge/version-${escapeBadgeField(projectVersion)}-${BADGE_COLOR}?style=flat-square"` +
  ` alt="Project version ${projectVersion}" /></a>`

const config: Config = {
  title: 'A First Course in Causal Inference - Solutions',
  tagline: 'Solutions to the homework problems in Peng Ding, A First Course in Causal Inference',
  favicon: 'img/favicon.svg',

  url: 'https://caverac.github.io',
  baseUrl: '/causal-inference-ding/',

  organizationName: 'caverac',
  projectName: 'causal-inference-ding',

  onBrokenLinks: 'throw',
  onBrokenAnchors: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'throw'
    }
  },

  customFields: {
    version: projectVersion,
    githubUrl: GITHUB_URL
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en']
  },

  stylesheets: [katexStylesheet()],

  // Registered by path, the form Docusaurus documents for local plugins; the
  // module types its own return value as Plugin<ProblemCounts>.
  plugins: ['./src/plugins/problemCounts.ts'],

  themes: [
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        language: ['en'],
        highlightSearchTermsOnTargetPage: true,
        explicitSearchResultPath: true,
        docsRouteBasePath: '/',
        indexBlog: false
      }
    ]
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
          // Must run before Docusaurus builds the table of contents, which the
          // regular `remarkPlugins` hook is too late for.
          beforeDefaultRemarkPlugins: [remarkTocMath],
          remarkPlugins: [remarkMath],
          rehypePlugins: [rehypeKatex]
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css'
        }
      } satisfies Preset.Options
    ]
  ],

  themeConfig: {
    navbar: {
      title: 'Causal Inference - Ding',
      logo: {
        alt: 'Causal Inference Solutions Logo',
        src: 'img/logo.svg'
      },
      items: [
        {
          type: 'html',
          position: 'right',
          value: versionBadgeHtml
        },
        {
          href: GITHUB_URL,
          label: 'GitHub',
          position: 'right'
        }
      ]
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Solutions',
          items: [
            {
              label: 'Getting Started',
              to: '/'
            }
          ]
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: GITHUB_URL
            }
          ]
        }
      ],
      copyright: `Copyright ${String(new Date().getFullYear())} Carlos Vera-Ciro. Built with Docusaurus.`
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['r']
    }
  } satisfies Preset.ThemeConfig
}

export default config
