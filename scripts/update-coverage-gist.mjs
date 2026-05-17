import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { buildMarkdown } from './coverage-report.mjs';

/**
 * @typedef {Object} CoverageReportOptions
 * @property {string} workspacePath - Absolute workspace path
 * @property {string|undefined} repository - GitHub owner/repo name
 * @property {string|undefined} commitSha - GitHub commit SHA
 */

/**
 * @typedef {Object} CliArguments
 * @property {boolean} dryRun - Print markdown instead of updating the Gist
 */

/**
 * Parses command-line arguments.
 *
 * @param {string[]} args - Raw command-line arguments
 * @returns {CliArguments} Parsed command-line arguments
 *
 * @example
 * parseArguments(['--dry-run'])
 */
function parseArguments(args) {
  return yargs(args)
    .usage('Usage: $0 [--dry-run]')
    .option('dry-run', {
      type: 'boolean',
      default: false,
      describe: 'Print the generated markdown without updating the Gist',
    })
    .strict()
    .parseSync();
}

/**
 * Updates the `coverage-report.md` file on a GitHub Gist.
 *
 * @param {string} gistId - GitHub Gist ID
 * @param {string} token - GitHub PAT with gist scope
 * @param {string} content - Markdown content to write
 * @returns {Promise<void>}
 * @throws {Error} When the GitHub API request times out
 * @throws {Error} When the GitHub API request fails or returns a non-OK status
 *
 * @example
 * await updateGist('abc123', process.env.GIST_SECRET, markdown)
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

/**
 * Reads a JSON file from disk.
 *
 * @param {string} filePath - Path to a JSON file
 * @returns {unknown} Parsed JSON content
 * @throws {SyntaxError} When the file is not valid JSON
 *
 * @example
 * readJsonFile('coverage/coverage-summary.json')
 */
function readJsonFile(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

/**
 * Validates the coverage summary has required aggregate metrics.
 *
 * @param {unknown} summary - Parsed coverage summary JSON
 * @returns {void}
 * @throws {Error} When required total coverage metrics are missing
 *
 * @example
 * assertValidSummary(summary)
 */
function assertValidSummary(summary) {
  if (
    summary?.total?.lines &&
    summary?.total?.statements &&
    summary?.total?.functions &&
    summary?.total?.branches
  ) {
    return;
  }

  throw new Error(
    'Invalid coverage/coverage-summary.json: missing total coverage metrics',
  );
}

/**
 * Creates the coverage report from files on disk.
 *
 * @param {CoverageReportOptions} options - Coverage report options
 * @returns {string} Formatted GitHub Markdown report
 * @throws {SyntaxError} When coverage JSON files are not valid JSON
 * @throws {Error} When coverage summary metrics are missing
 *
 * @example
 * createCoverageReport({ workspacePath: process.cwd(), repository: 'owner/repo', commitSha: 'abc123' })
 */
function createCoverageReport({ workspacePath, repository, commitSha }) {
  const summary = readJsonFile('coverage/coverage-summary.json');
  const finalCoverage = readJsonFile('coverage/coverage-final.json');

  assertValidSummary(summary);

  return buildMarkdown({
    summary,
    finalCoverage,
    workspacePath,
    repository,
    commitSha,
  });
}

/**
 * Updates the configured Gist with the current coverage report.
 *
 * @returns {Promise<void>}
 * @throws {Error} When Gist environment variables are missing
 * @throws {Error} When the GitHub API request fails
 * @throws {SyntaxError} When coverage JSON files are not valid JSON
 *
 * @example
 * await main()
 */
async function main() {
  const { dryRun } = parseArguments(hideBin(process.argv));

  const markdown = createCoverageReport({
    workspacePath: process.env.GITHUB_WORKSPACE ?? process.cwd(),
    repository: process.env.GITHUB_REPOSITORY,
    commitSha: process.env.GITHUB_SHA,
  });

  if (dryRun) {
    console.log(markdown);
    return;
  }

  const gistId = process.env.COVERAGE_GIST_ID;
  const token = process.env.GIST_SECRET;

  if (!gistId || !token) {
    throw new Error('COVERAGE_GIST_ID and GIST_SECRET must be set');
  }

  await updateGist(gistId, token, markdown);
  console.log('Coverage report updated in Gist.');
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main();
}

export { createCoverageReport, updateGist };
