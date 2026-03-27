import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { ConventionalChangelog } from 'conventional-changelog';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 --bump <major|minor|patch> [--dry-run]')
  .option('bump', {
    alias: 'b',
    type: 'string',
    choices: ['major', 'minor', 'patch'],
    demandOption: true,
    describe: 'Semver bump type',
  })
  .option('dry-run', {
    type: 'boolean',
    default: false,
    describe: 'Preview release notes without releasing',
  })
  .strict()
  .parseSync();

const { bump, dryRun } = argv;

const chunks = [];

for await (const chunk of new ConventionalChangelog()
  .loadPreset('conventionalcommits')
  .write()) {
  chunks.push(chunk);
}

let notes = chunks.join('');
const firstNewline = notes.indexOf('\n');
if (firstNewline !== -1) {
  notes = notes.slice(firstNewline + 1).trim();
}

if (!notes) {
  notes = 'No notable changes.';
}

if (dryRun) {
  console.log(`Dry run for ${bump} release:\n`);
  console.log(notes);
  process.exit(0);
}

execFileSync('npm', ['version', bump, '--no-git-tag-version'], {
  stdio: 'inherit',
});

const { version: newVersion } = JSON.parse(
  readFileSync('./package.json', 'utf8'),
);
const tag = `v${newVersion}`;
const notesFile = `.release-notes-${tag}.md`;

writeFileSync(notesFile, notes);

execFileSync('git', ['add', 'package.json', 'yarn.lock'], { stdio: 'inherit' });
execFileSync('git', ['commit', '-m', `chore: release ${tag}`], {
  stdio: 'inherit',
});
execFileSync('git', ['tag', '-a', tag, '-m', tag], { stdio: 'inherit' });

try {
  execFileSync('git', ['push', 'origin', 'main', '--follow-tags'], {
    stdio: 'inherit',
  });
  execFileSync(
    'gh',
    ['release', 'create', tag, '--title', tag, '--notes-file', notesFile],
    {
      stdio: 'inherit',
    },
  );
  console.log(`\nReleased ${tag}`);
} finally {
  unlinkSync(notesFile);
}
