import { fileCoverageTable } from './coverage-file-report.mjs';

/**
 * @typedef {Object} CoverageMetric
 * @property {number} total - Total count
 * @property {number} covered - Covered count
 * @property {number} skipped - Skipped count
 * @property {number} pct - Coverage percentage
 */

/**
 * @typedef {Object} CoverageTotals
 * @property {CoverageMetric} lines - Line coverage
 * @property {CoverageMetric} statements - Statement coverage
 * @property {CoverageMetric} functions - Function coverage
 * @property {CoverageMetric} branches - Branch coverage
 */

/**
 * @typedef {Object} CoverageSummary
 * @property {CoverageTotals} total - Aggregate coverage totals
 */

/**
 * @typedef {Object} FileCoverageDetail
 * @property {Record<string, number>} s - Statement execution counts
 * @property {Record<string, Object>} statementMap - Statement ranges
 */

/**
 * @typedef {Object} CoverageReportInput
 * @property {CoverageSummary} summary - Vitest summary coverage report
 * @property {Record<string, FileCoverageDetail>} finalCoverage - Vitest final coverage report
 * @property {string} workspacePath - Absolute workspace path
 * @property {string|undefined} repository - GitHub owner/repo name
 * @property {string|undefined} commitSha - GitHub commit SHA
 */

/**
 * Returns an emoji status icon based on coverage percentage.
 *
 * @param {number} pct - Coverage percentage
 * @returns {string} Emoji status icon
 *
 * @example
 * statusIcon(100)
 */
function statusIcon(pct) {
  if (pct >= 100) {
    return '🔵';
  }
  if (pct >= 90) {
    return '🟢';
  }
  if (pct >= 70) {
    return '🟡';
  }
  return '🔴';
}

/**
 * Formats one aggregate coverage row.
 *
 * @param {string} category - Category label
 * @param {CoverageMetric} metric - Coverage metric data
 * @returns {string} Markdown table row
 *
 * @example
 * summaryRow('Lines', { pct: 100, covered: 1, total: 1, skipped: 0 })
 */
function summaryRow(category, metric) {
  return `| ${statusIcon(metric.pct)} | ${category} | ${metric.pct}% | ${metric.covered} / ${metric.total} |`;
}

/**
 * Builds the aggregate coverage summary table.
 *
 * @param {CoverageTotals} totals - Coverage summary totals
 * @returns {string} Markdown summary table
 *
 * @example
 * summaryTable(summary.total)
 */
function summaryTable(totals) {
  return [
    '| Status | Category | Percentage | Covered / Total |',
    '| :---: | :--- | ---: | ---: |',
    summaryRow('Lines', totals.lines),
    summaryRow('Statements', totals.statements),
    summaryRow('Functions', totals.functions),
    summaryRow('Branches', totals.branches),
  ].join('\n');
}

/**
 * Builds a GitHub Markdown coverage report from Vitest coverage data.
 *
 * @param {CoverageReportInput} input - Coverage report input data
 * @returns {string} Formatted GitHub Markdown report
 *
 * @example
 * buildMarkdown({ summary, finalCoverage, workspacePath, repository, commitSha })
 */
function buildMarkdown(input) {
  return [
    '## Coverage Report',
    '',
    summaryTable(input.summary.total),
    '',
    '### File Coverage',
    '',
    fileCoverageTable(input),
  ].join('\n');
}

export { buildMarkdown };
