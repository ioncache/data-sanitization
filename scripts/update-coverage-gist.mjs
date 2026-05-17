import { readFileSync } from 'node:fs';

/**
 * @typedef {Object} CoverageMetric
 * @property {number} total - Total count
 * @property {number} covered - Covered count
 * @property {number} skipped - Skipped count
 * @property {number} pct - Coverage percentage
 */

/**
 * @typedef {Object} CoverageTotals
 * @property {CoverageMetric} lines
 * @property {CoverageMetric} statements
 * @property {CoverageMetric} functions
 * @property {CoverageMetric} branches
 */

/**
 * Returns an emoji status icon based on coverage percentage.
 *
 * @param {number} pct - Coverage percentage (0–100)
 * @returns {string} Emoji status icon
 *
 * @example
 * statusIcon(100) // '🔵'
 * statusIcon(95)  // '🟢'
 * statusIcon(75)  // '🟡'
 * statusIcon(50)  // '🔴'
 */
function statusIcon(pct) {
  if (pct >= 100) return '🔵';
  if (pct >= 90) return '🟢';
  if (pct >= 70) return '🟡';
  return '🔴';
}

/**
 * Formats a single coverage category as a GFM table row.
 *
 * @param {string} category - Category name (e.g. 'Lines')
 * @param {CoverageMetric} metric - Coverage metric data
 * @returns {string} Markdown table row
 *
 * @example
 * tableRow('Lines', { pct: 100, covered: 56, total: 56, skipped: 0 })
 * // '| 🔵 | Lines | 100% | 56 / 56 |'
 */
function tableRow(category, metric) {
  const { pct, covered, total } = metric;
  return `| ${statusIcon(pct)} | ${category} | ${pct}% | ${covered} / ${total} |`;
}

/**
 * Builds a markdown coverage report table from coverage totals.
 *
 * @param {CoverageTotals} totals - Coverage summary totals
 * @returns {string} Formatted GFM markdown report
 *
 * @example
 * buildMarkdown(summary.total)
 * // '## Coverage Report\n\n| Status | Category | ...'
 */
function buildMarkdown(totals) {
  const lines = [
    '## Coverage Report',
    '',
    '| Status | Category | Percentage | Covered / Total |',
    '| :---: | :--- | ---: | ---: |',
    tableRow('Lines', totals.lines),
    tableRow('Statements', totals.statements),
    tableRow('Functions', totals.functions),
    tableRow('Branches', totals.branches),
  ];

  return lines.join('\n');
}

/**
 * Updates the `coverage-report.md` file on a GitHub Gist.
 *
 * @param {string} gistId - GitHub Gist ID
 * @param {string} token - GitHub PAT with gist scope
 * @param {string} content - Markdown content to write
 * @returns {Promise<void>}
 * @throws {Error} When the GitHub API request times out or returns a non-OK status
 */
async function updateGist(gistId, token, content) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  let response;

  try {
    response = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        files: {
          'coverage-report.md': { content },
        },
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('GitHub API request timed out after 15s', {
        cause: error,
      });
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API error ${response.status}: ${body}`);
  }
}

const gistId = process.env.COVERAGE_GIST_ID;
const token = process.env.GIST_SECRET;

if (!gistId || !token) {
  console.error('COVERAGE_GIST_ID and GIST_SECRET must be set');
  process.exit(1);
}

const summary = JSON.parse(
  readFileSync('coverage/coverage-summary.json', 'utf8'),
);

if (
  !summary?.total?.lines ||
  !summary?.total?.statements ||
  !summary?.total?.functions ||
  !summary?.total?.branches
) {
  throw new Error(
    'Invalid coverage/coverage-summary.json: missing total coverage metrics',
  );
}

const markdown = buildMarkdown(summary.total);

await updateGist(gistId, token, markdown);
console.log('Coverage report updated in Gist.');
