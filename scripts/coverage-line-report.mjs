/**
 * @typedef {Object} CoverageLocation
 * @property {number} line - One-based source line number
 */

/**
 * @typedef {Object} StatementLocation
 * @property {CoverageLocation} start - Statement start location
 * @property {CoverageLocation} end - Statement end location
 */

/**
 * @typedef {Object} FileCoverageDetail
 * @property {Record<string, number>} s - Statement execution counts
 * @property {Record<string, StatementLocation>} statementMap - Statement ranges
 */

/**
 * @typedef {Object} LineRange
 * @property {number} start - First uncovered line
 * @property {number} end - Last uncovered line
 */

/**
 * @typedef {Object} RangeLinksInput
 * @property {LineRange[]} ranges - Uncovered line ranges
 * @property {string|undefined} fileUrl - GitHub source URL
 */

/**
 * Escapes text for safe insertion into a Markdown table cell.
 *
 * @param {string} value - Text to escape
 * @returns {string} Escaped text
 *
 * @example
 * escapeMarkdownCell('src/file|name.ts')
 */
function escapeMarkdownCell(value) {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('|', '\\|')
    .replaceAll('[', '\\[')
    .replaceAll(']', '\\]')
    .replaceAll('\n', ' ')
    .replaceAll('\r', ' ');
}

/**
 * Escapes URL characters that can terminate a Markdown link destination.
 *
 * @param {string} value - URL to escape
 * @returns {string} URL safe for Markdown link syntax
 *
 * @example
 * escapeMarkdownUrl('https://example.test/a_(b).ts')
 */
function escapeMarkdownUrl(value) {
  return value.replaceAll('(', '%28').replaceAll(')', '%29');
}

/**
 * Gets contiguous uncovered line ranges from statement coverage.
 *
 * @param {FileCoverageDetail|undefined} detail - Per-file final coverage detail
 * @returns {LineRange[]} Uncovered line ranges
 *
 * @example
 * uncoveredLineRanges(finalCoverage['/repo/src/index.ts'])
 */
function uncoveredLineRanges(detail) {
  if (!detail?.s || !detail?.statementMap) return [];

  const ranges = [];
  let currentRange;

  for (const key of Object.keys(detail.statementMap)) {
    const location = detail.statementMap[key];
    if (detail.s[key] > 0) {
      if (currentRange) ranges.push(currentRange);
      currentRange = undefined;
      continue;
    }

    if (!currentRange) {
      currentRange = { start: location.start.line, end: location.end.line };
      continue;
    }

    currentRange.end = location.end.line;
  }

  if (currentRange) ranges.push(currentRange);
  return ranges;
}

/**
 * Formats a line range as source text.
 *
 * @param {LineRange} range - One uncovered line range
 * @returns {string} Display text for the range
 *
 * @example
 * lineRangeText({ start: 2, end: 4 })
 */
function lineRangeText(range) {
  if (range.start === range.end) return `${range.start}`;
  return `${range.start}-${range.end}`;
}

/**
 * Formats uncovered line ranges as GitHub links when possible.
 *
 * @param {RangeLinksInput} input - Formatting input
 * @returns {string} Markdown content for the uncovered lines cell
 *
 * @example
 * uncoveredLineLinks({ ranges: [{ start: 2, end: 4 }], fileUrl: undefined })
 */
function uncoveredLineLinks(input) {
  return input.ranges
    .map((range) => {
      const label = lineRangeText(range);
      if (!input.fileUrl) return escapeMarkdownCell(label);

      const hash =
        range.start === range.end
          ? `#L${range.start}`
          : `#L${range.start}-L${range.end}`;
      return `[${label}](${escapeMarkdownUrl(`${input.fileUrl}${hash}`)})`;
    })
    .join(', ');
}

export {
  escapeMarkdownCell,
  escapeMarkdownUrl,
  uncoveredLineLinks,
  uncoveredLineRanges,
};
