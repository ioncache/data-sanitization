import path from 'node:path';

const generatedSdkDirectory = `.yarn${path.sep}sdks${path.sep}`;

const isGeneratedSdkFile = (filePath) => {
  const relativePath = path.relative(process.cwd(), filePath);
  return relativePath.startsWith(generatedSdkDirectory);
};

const isYamlFile = (filePath) => {
  const extension = path.extname(filePath).toLowerCase();
  return extension === '.yaml' || extension === '.yml';
};

const isWorkflowFile = (filePath) => {
  const relativePath = path.relative(process.cwd(), filePath);
  return relativePath.startsWith(`.github${path.sep}workflows${path.sep}`);
};

const isSourceToolTarget = (filePath) => !isGeneratedSdkFile(filePath);

const quotePath = (filePath) => JSON.stringify(filePath);

const runCommand =
  ({ command, includeFile = isSourceToolTarget }) =>
  (filePaths) => {
    const targetPaths = filePaths.filter(includeFile);

    if (targetPaths.length === 0) return [];

    return `${command} ${targetPaths.map(quotePath).join(' ')}`;
  };

const compactCommands = (commands) =>
  commands.filter((command) => typeof command === 'string');

const runStructuredDataTasks = (filePaths) =>
  compactCommands([
    runCommand({ command: 'oxfmt' })(filePaths),
    runCommand({ command: 'yamllint', includeFile: isYamlFile })(filePaths),
    runCommand({ command: 'github-actionlint', includeFile: isWorkflowFile })(
      filePaths,
    ),
  ]);

export default {
  '*.{ts,js,mjs,cjs}': [
    runCommand({ command: 'oxlint --fix' }),
    runCommand({ command: 'oxfmt' }),
  ],
  '*.md': runCommand({ command: 'oxfmt' }),
  '*.{json,yml,yaml}': runStructuredDataTasks,
  '*.sh': './scripts/shell_lint.sh',
};
