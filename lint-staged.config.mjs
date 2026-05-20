import path from 'node:path';

const generatedSdkDirectory = `.yarn${path.sep}sdks${path.sep}`;

const isGeneratedSdkFile = (filePath) => {
  const relativePath = path.relative(process.cwd(), filePath);
  return relativePath.startsWith(generatedSdkDirectory);
};

const quotePath = (filePath) => JSON.stringify(filePath);

const runCommand = (command) => (filePaths) => {
  const targetPaths = filePaths.filter(
    (filePath) => !isGeneratedSdkFile(filePath),
  );

  if (targetPaths.length === 0) return [];

  return `${command} ${targetPaths.map(quotePath).join(' ')}`;
};

export default {
  '*.{ts,js,mjs,cjs}': [runCommand('oxlint --fix'), runCommand('oxfmt')],
  '*.md': runCommand('oxfmt'),
  '*.{json,yml,yaml}': runCommand('oxfmt'),
  '*.sh': './scripts/shell_lint.sh',
};
