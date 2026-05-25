import path from 'node:path';
import {
  escapeMarkdownCell,
  escapeMarkdownUrl,
  uncoveredLineLinks,
  uncoveredLineRanges,
} from './coverage-line-report.mjs';

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
 * @property {Record<string, unknown>} statementMap - Statement ranges
 */

/**
 * @typedef {Object} FileCoverageEntry
 * @property {string} filePath - Absolute file path from Vitest coverage
 * @property {string} relativePath - Repository-relative file path
 * @property {CoverageTotals} totals - Per-file coverage totals
 */

/**
 * @typedef {Object} FileCoverageTableInput
 * @property {CoverageSummary} summary - Vitest summary coverage report
 * @property {Record<string, FileCoverageDetail>} finalCoverage - Vitest final coverage report
 * @property {string} workspacePath - Absolute workspace path
 * @property {string|undefined} repository - GitHub owner/repo name
 * @property {string|undefined} commitSha - GitHub commit SHA
 */

/**
 * @typedef {Object} SourceUrlInput
 * @property {string|undefined} repository - GitHub owner/repo name
 * @property {string|undefined} commitSha - GitHub commit SHA
 * @property {string} relativePath - Repository-relative file path
 */

/**
 * @typedef {Object} FileRowInput
 * @property {FileCoverageEntry} entry - Per-file coverage entry
 * @property {Record<string, FileCoverageDetail>} finalCoverage - Vitest final coverage report
 * @property {string|undefined} fileUrl - GitHub source URL
 */

/**
 * Converts a coverage file path to a repository-relative path.
 *
 * @param {string} filePath - Absolute file path from coverage data
 * @param {string} workspacePath - Absolute workspace path
 * @returns {string} Repository-relative path
 *
 * @example
 * relativeCoveragePath('/repo/src/index.ts', '/repo')
 */
function relativeCoveragePath(filePath, workspacePath) {
  return path.relative(workspacePath, filePath).split(path.sep).join('/');
}

/**
 * Returns sorted per-file coverage entries from a Vitest summary report.
 *
 * @param {CoverageSummary} summary - Vitest summary coverage report
 * @param {string} workspacePath - Absolute workspace path
 * @returns {FileCoverageEntry[]} Sorted per-file coverage entries
 *
 * @example
 * fileCoverageEntries(summary, process.cwd())
 */
function fileCoverageEntries(summary, workspacePath) {
  return Object.entries(summary)
    .filter(([filePath]) => filePath !== 'total')
    .map(([filePath, totals]) => ({
      filePath,
      relativePath: relativeCoveragePath(filePath, workspacePath),
      totals,
    }))
    .toSorted((left, right) =>
      left.relativePath.localeCompare(right.relativePath),
    );
}

/**
 * Builds a GitHub source URL for a repository-relative path.
 *
 * @param {SourceUrlInput} input - URL input
 * @returns {string|undefined} GitHub source URL when context is available
 *
 * @example
 * sourceFileUrl({ repository: 'owner/repo', commitSha: 'abc123', relativePath: 'src/index.ts' })
 */
function sourceFileUrl(input) {
  if (!input.repository || !input.commitSha) {
    return undefined;
  }
  return `https://github.com/${input.repository}/blob/${input.commitSha}/${encodeURI(input.relativePath)}`;
}

/**
 * Formats a file cell with a GitHub link when possible.
 *
 * @param {FileCoverageEntry} entry - Per-file coverage entry
 * @param {string|undefined} fileUrl - GitHub source URL
 * @returns {string} Markdown table cell content
 *
 * @example
 * fileCell(entry, undefined)
 */
function fileCell(entry, fileUrl) {
  const label = escapeMarkdownCell(entry.relativePath);
  if (!fileUrl) {
    return label;
  }
  return `[${label}](${escapeMarkdownUrl(fileUrl)})`;
}

/**
 * Formats a coverage metric cell.
 *
 * @param {CoverageMetric} metric - Coverage metric data
 * @returns {string} Markdown table cell content
 *
 * @example
 * metricCell({ pct: 100, covered: 1, total: 1, skipped: 0 })
 */
function metricCell(metric) {
  return `${metric.pct}%`;
}

/**
 * Formats one file coverage row.
 *
 * @param {FileRowInput} input - Row input
 * @returns {string} Markdown table row
 *
 * @example
 * fileCoverageRow({ entry, finalCoverage, fileUrl: undefined })
 */
function fileCoverageRow(input) {
  const ranges = uncoveredLineRanges(input.finalCoverage[input.entry.filePath]);
  return `| ${fileCell(input.entry, input.fileUrl)} | ${metricCell(input.entry.totals.statements)} | ${metricCell(input.entry.totals.branches)} | ${metricCell(input.entry.totals.functions)} | ${metricCell(input.entry.totals.lines)} | ${uncoveredLineLinks({ fileUrl: input.fileUrl, ranges })} |`;
}

/**
 * Builds the file coverage table.
 *
 * @param {FileCoverageTableInput} input - Coverage report input data
 * @returns {string} Markdown file coverage table
 *
 * @example
 * fileCoverageTable({ summary, finalCoverage, workspacePath, repository, commitSha })
 */
function fileCoverageTable(input) {
  const rows = fileCoverageEntries(input.summary, input.workspacePath).map(
    (entry) =>
      fileCoverageRow({
        entry,
        fileUrl: sourceFileUrl({
          commitSha: input.commitSha,
          relativePath: entry.relativePath,
          repository: input.repository,
        }),
        finalCoverage: input.finalCoverage,
      }),
  );

  return [
    '| File | Stmts | Branches | Functions | Lines | Uncovered Lines |',
    '| :--- | ---: | ---: | ---: | ---: | :--- |',
    ...rows,
  ].join('\n');
}

export { fileCoverageTable };
