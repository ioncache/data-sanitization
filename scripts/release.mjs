import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { checkbox, confirm, select } from '@inquirer/prompts';

const COMMIT_END = '---END---';

const RELEASE_NOTE_TYPES = new Set(['feat', 'fix', 'perf', 'revert']);

const SECTION_TITLES = {
  feat: 'Features',
  fix: 'Bug Fixes',
  perf: 'Performance',
  revert: 'Reverts',
};

/**
 * Runs a git command and returns trimmed stdout.
 *
 * @param {...string} args - Git arguments
 * @returns {string} Trimmed stdout
 * @throws {Error} When the git command exits with a non-zero status
 *
 * @example
 * git('log', '--oneline', '-5')
 */
function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

/**
 * Returns the GitHub owner/repo slug derived from the origin remote URL.
 *
 * @returns {string|null} Slug like `owner/repo`, or null if not determinable
 *
 * @example
 * getRepoSlug() // 'ioncache/data-sanitization'
 */
function getRepoSlug() {
  try {
    const url = git('remote', 'get-url', 'origin');
    const match = url.match(/github\.com[:/](.+?)(?:\.git)?$/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * Reads all workspace packages from `packages/`.
 *
 * @returns {{ name: string, dir: string, path: string, version: string }[]}
 *
 * @example
 * getWorkspacePackages()
 */
function getWorkspacePackages() {
  return readdirSync('packages', { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const pkg = JSON.parse(
        readFileSync(`packages/${d.name}/package.json`, 'utf8'),
      );
      return {
        dir: d.name,
        name: pkg.name,
        path: `packages/${d.name}`,
        version: pkg.version,
      };
    });
}

/**
 * Finds the most recent release tag for a package.
 * Tries `<name>@x.y.z` first, then falls back to `v*` for packages that
 * predate the prefixed tag scheme.
 *
 * @param {string} packageName - npm package name
 * @returns {string|null} Most recent tag, or null if none exists
 *
 * @example
 * getLastTag('data-sanitization') // 'data-sanitization@1.4.1'
 */
function getLastTag(packageName) {
  const opts = { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] };
  try {
    return execFileSync(
      'git',
      ['describe', '--tags', '--abbrev=0', '--match', `${packageName}@*`],
      opts,
    ).trim();
  } catch {
    try {
      return execFileSync(
        'git',
        ['describe', '--tags', '--abbrev=0', '--match', 'v*'],
        opts,
      ).trim();
    } catch {
      return null;
    }
  }
}

/**
 * Returns all commits since a tag that touch files under a package path.
 *
 * @param {string|null} tag - Git tag to use as the lower bound, or null for all commits
 * @param {string} packagePath - Relative path to the package directory
 * @returns {{ hash: string, type: string, description: string, prNumber: string|undefined, isBreaking: boolean, breakingNote: string|undefined }[]}
 *
 * @example
 * getCommitsSince('data-sanitization@1.4.1', 'packages/data-sanitization')
 */
function getCommitsSince(tag, packagePath) {
  const range = tag ? `${tag}..HEAD` : 'HEAD';
  let raw;
  try {
    raw = execFileSync(
      'git',
      ['log', range, `--format=%H%n%s%n%b%n${COMMIT_END}`, '--', packagePath],
      { encoding: 'utf8' },
    ).trim();
  } catch {
    return [];
  }
  if (!raw) {
    return [];
  }
  return raw
    .split(`\n${COMMIT_END}`)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(parseCommit)
    .filter(Boolean);
}

/**
 * Parses a raw git log record into structured commit fields.
 *
 * @param {string} raw - Raw commit record with hash, subject, and body lines
 * @returns {{ hash: string, type: string, description: string, prNumber: string|undefined, isBreaking: boolean, breakingNote: string|undefined }|null}
 *
 * @example
 * parseCommit('abc1234\nfeat: add streaming support (#310)\n')
 */
function parseCommit(raw) {
  const lines = raw.split('\n');
  if (lines.length < 2) {
    return null;
  }
  const hash = lines[0].trim();
  const subject = lines[1].trim();
  const body = lines.slice(2).join('\n').trim();

  const match = subject.match(/^(\w+)(\([^)]+\))?(!)?: (.+?)(\s*\(#(\d+)\))?$/);
  if (!match) {
    return null;
  }

  const [, type, , bang, description, , prNumber] = match;
  const isBreaking = !!bang || /^BREAKING CHANGE:/m.test(body);
  const breakingNote = body.match(/^BREAKING CHANGE: (.+)/m)?.[1];

  return {
    breakingNote,
    description,
    hash: hash.slice(0, 7),
    isBreaking,
    prNumber,
    type,
  };
}

/**
 * Suggests the minimum semver bump type based on commit types.
 *
 * @param {{ type: string, isBreaking: boolean }[]} commits
 * @returns {'major'|'minor'|'patch'}
 *
 * @example
 * suggestBump([{ type: 'feat', isBreaking: false }]) // 'minor'
 */
function suggestBump(commits) {
  if (commits.some((c) => c.isBreaking)) {
    return 'major';
  }
  if (commits.some((c) => c.type === 'feat')) {
    return 'minor';
  }
  return 'patch';
}

/**
 * Calculates the next version string for a given bump type.
 *
 * @param {string} version - Current semver version string
 * @param {'major'|'minor'|'patch'} bump - Bump type
 * @returns {string} Next version string
 *
 * @example
 * bumpVersion('1.4.1', 'minor') // '1.5.0'
 */
function bumpVersion(version, bump) {
  const [major, minor, patch] = version.split('.').map(Number);
  if (bump === 'major') {
    return `${major + 1}.0.0`;
  }
  if (bump === 'minor') {
    return `${major}.${minor + 1}.0`;
  }
  return `${major}.${minor}.${patch + 1}`;
}

/**
 * Builds GitHub-flavoured Markdown release notes from parsed commits.
 * Breaking changes appear in a dedicated section at the top. Commits of
 * types not in RELEASE_NOTE_TYPES (e.g. chore, docs, ci) are omitted.
 *
 * @param {{ type: string, description: string, prNumber: string|undefined, isBreaking: boolean, breakingNote: string|undefined }[]} commits
 * @param {string|null} repoSlug - GitHub owner/repo slug for PR links
 * @returns {string} Markdown release notes
 *
 * @example
 * buildReleaseNotes(commits, 'ioncache/data-sanitization')
 */
function buildReleaseNotes(commits, repoSlug) {
  const breaking = [];
  const sections = {};

  for (const c of commits) {
    const link =
      c.prNumber && repoSlug
        ? ` ([#${c.prNumber}](https://github.com/${repoSlug}/pull/${c.prNumber}))`
        : '';

    if (c.isBreaking) {
      const note = c.breakingNote ? ` — ${c.breakingNote}` : '';
      breaking.push(`- **${c.description}**${link}${note}`);
    }

    if (RELEASE_NOTE_TYPES.has(c.type)) {
      (sections[SECTION_TITLES[c.type]] ??= []).push(
        `- ${c.description}${link}`,
      );
    }
  }

  const parts = [];
  if (breaking.length > 0) {
    parts.push(`### ⚠️ Breaking Changes\n\n${breaking.join('\n')}`);
  }
  for (const [title, items] of Object.entries(sections)) {
    parts.push(`### ${title}\n\n${items.join('\n')}`);
  }

  return parts.join('\n\n') || '_No user-facing changes._';
}

/**
 * Writes a new version into a package's package.json.
 *
 * @param {string} packagePath - Relative path to the package directory
 * @param {string} newVersion - New version string to write
 *
 * @example
 * writeVersion('packages/data-sanitization', '1.5.0')
 */
function writeVersion(packagePath, newVersion) {
  const pkgPath = `${packagePath}/package.json`;
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  pkg.version = newVersion;
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

async function main() {
  const currentBranch = git('branch', '--show-current');
  if (currentBranch !== 'main') {
    throw new Error(
      `Release must be run from main (current: ${currentBranch})`,
    );
  }

  const dirtyFiles = git('status', '--porcelain');
  if (dirtyFiles) {
    throw new Error(
      'Working tree is not clean. Commit or stash changes before releasing.',
    );
  }

  const repoSlug = getRepoSlug();
  const packages = getWorkspacePackages();

  const info = packages.map((pkg) => {
    const lastTag = getLastTag(pkg.name);
    const commits = getCommitsSince(lastTag, pkg.path);
    const suggestion = suggestBump(commits.filter((c) => c.type !== 'chore'));
    return { ...pkg, commits, lastTag, suggestion };
  });

  console.log('\nUnreleased commits per package:\n');
  for (const p of info) {
    const since = p.lastTag ?? '(no prior release)';
    const userFacing = p.commits.filter(
      (c) => RELEASE_NOTE_TYPES.has(c.type) || c.isBreaking,
    ).length;
    console.log(
      `  ${p.name}  [since ${since}]  ${p.commits.length} commits, ${userFacing} user-facing  →  suggest ${p.suggestion}`,
    );
  }
  console.log();

  const withCommits = info.filter((p) => p.commits.length > 0);
  if (withCommits.length === 0) {
    console.log('Nothing to release.');
    return;
  }

  const selectedNames = await checkbox({
    choices: withCommits.map((p) => ({
      checked: p.commits.some(
        (c) => RELEASE_NOTE_TYPES.has(c.type) || c.isBreaking,
      ),
      name: `${p.name}  (${p.commits.length} commits, suggest ${p.suggestion})`,
      value: p.name,
    })),
    message: 'Select packages to release:',
  });

  if (selectedNames.length === 0) {
    console.log('No packages selected.');
    return;
  }

  const selected = info.filter((p) => selectedNames.includes(p.name));

  const releases = [];
  for (const pkg of selected) {
    const bump = await select({
      choices: ['patch', 'minor', 'major'].map((b) => ({
        name: `${b}  →  ${bumpVersion(pkg.version, b)}`,
        value: b,
      })),
      default: pkg.suggestion,
      message: `Bump type for ${pkg.name} (current: ${pkg.version})?`,
    });
    const newVersion = bumpVersion(pkg.version, bump);
    const notes = buildReleaseNotes(pkg.commits, repoSlug);
    releases.push({ ...pkg, bump, newVersion, notes });
  }

  console.log('\n─── Release Preview ───────────────────────────────\n');
  for (const r of releases) {
    console.log(`${r.name}  ${r.version}  →  ${r.newVersion}  (${r.bump})\n`);
    console.log(r.notes);
    console.log();
  }
  console.log('────────────────────────────────────────────────────\n');

  const proceed = await confirm({
    default: false,
    message: 'Proceed with release?',
  });
  if (!proceed) {
    console.log('Aborted.');
    return;
  }

  for (const r of releases) {
    const tag = `${r.name}@${r.newVersion}`;
    console.log(`\nReleasing ${tag}...`);

    writeVersion(r.path, r.newVersion);
    git('add', `${r.path}/package.json`);
    git('commit', '-m', `chore: release ${tag}`);
    git('tag', '-a', tag, '-m', tag);

    execFileSync(
      'gh',
      ['release', 'create', tag, '--title', tag, '--notes', r.notes],
      { stdio: 'inherit' },
    );

    console.log(`✓ ${tag}`);
  }

  git('push', 'origin', 'main', '--follow-tags');
  console.log('\n✓ Pushed to origin.\n');

  console.log('To publish to npm:');
  for (const r of releases) {
    console.log(`  yarn workspace ${r.name} npm publish`);
  }
  console.log();
}

main().catch((err) => {
  console.error(`\nError: ${err.message}`);
  process.exit(1);
});
