import path from 'node:path';

const generatedSdkDirectory = `.yarn${path.sep}sdks${path.sep}`;

const isGeneratedSdkFile = (filePath) => {
  const relativePath = path.relative(process.cwd(), filePath);
  return relativePath.startsWith(generatedSdkDirectory);
};

const excludedMarkdownPrefixes = [
  `docs${path.sep}plans${path.sep}`,
  `.ai${path.sep}`,
  `.remember${path.sep}`,
  `.agents${path.sep}`,
  `.claude${path.sep}`,
  `.github${path.sep}instructions${path.sep}`,
  `.github${path.sep}skills${path.sep}`,
  `.github${path.sep}prompts${path.sep}`,
];

const isLintableMarkdown = (filePath) => {
  const relativePath = path.relative(process.cwd(), filePath);
  return (
    !isGeneratedSdkFile(filePath) &&
    !excludedMarkdownPrefixes.some((prefix) => relativePath.startsWith(prefix))
  );
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

    if (targetPaths.length === 0) {
      return [];
    }

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

const runMarkdownTasks = (filePaths) =>
  compactCommands([
    runCommand({
      command: 'markdownlint-cli2',
      includeFile: isLintableMarkdown,
    })(filePaths),
    runCommand({ command: 'oxfmt' })(filePaths),
  ]);

export default {
  '*.{json,yml,yaml}': runStructuredDataTasks,
  '*.{ts,js,mjs,cjs}': [
    runCommand({ command: 'oxlint --fix' }),
    runCommand({ command: 'oxfmt' }),
  ],
  '*.md': runMarkdownTasks,
  '*.sh': './scripts/shell_lint.sh',
};
