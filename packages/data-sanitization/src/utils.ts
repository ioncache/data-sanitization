import { BuildSanitizedWarningOptions } from './types';

/**
 * Recursively diffs two objects and returns dot-notation paths for any keys
 * whose values changed. Object keys use dot notation (`user.email`); array
 * indices use bracket notation (`items[0].password`). Keys present in
 * `original` but absent in `sanitized` are included (covers `removeMatches`
 * behaviour).
 *
 * @param original - The original, unsanitized object.
 * @param sanitized - The sanitized object produced by `sanitizeData`.
 * @returns Dot/bracket-notation paths of every field that changed.
 *
 * @example
 * diffSanitizedFields(
 *   { user: { email: 'a@b.com' }, msg: 'hi' },
 *   { user: { email: '**********' }, msg: 'hi' },
 * )
 * // => ['user.email']
 *
 * @example
 * diffSanitizedFields(
 *   { tokens: ['abc', 'def'] },
 *   { tokens: ['**********', '**********'] },
 * )
 * // => ['tokens[0]', 'tokens[1]']
 */
const diffSanitizedFields = (original: object, sanitized: object): string[] => {
  const changed: string[] = [];

  const walk = (a: unknown, b: unknown, path: string): void => {
    if (a === b) {
      return;
    }

    const aIsObj = typeof a === 'object' && a !== null;
    const bIsObj = typeof b === 'object' && b !== null;

    if (!aIsObj || !bIsObj) {
      /* istanbul ignore next -- path is always non-empty at a nested call site;
         reaching here with path='' requires a null/primitive root, which violates
         the public API contract */
      if (path) {
        changed.push(path);
      }
      return;
    }

    if (Array.isArray(a) && Array.isArray(b)) {
      const len = Math.max(a.length, b.length);
      for (let i = 0; i < len; i++) {
        walk(a[i], b[i], path ? `${path}[${i}]` : `[${i}]`);
      }
      return;
    }

    if (Array.isArray(a) !== Array.isArray(b)) {
      if (path) {
        changed.push(path);
      }
      return;
    }

    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;

    for (const key of Object.keys(aObj)) {
      const childPath = path ? `${path}.${key}` : key;
      if (!(key in bObj)) {
        changed.push(childPath);
      } else {
        walk(aObj[key], bObj[key], childPath);
      }
    }
  };

  walk(original, sanitized, '');
  return changed;
};

const WARN_LEVEL = 40;
const WARN_MSG = 'sensitive data found in log entry';

const isPlainObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Extracts the top-level key from a dot/bracket-notation path.
 *
 * @param path - A dot/bracket-notation field path.
 * @returns The key segment before the first `.` or `[`.
 *
 * @example
 * topLevelKey('user.email')  // => 'user'
 * topLevelKey('items[0].x') // => 'items'
 * topLevelKey('email')       // => 'email'
 */
const topLevelKey = (path: string): string => {
  const dot = path.indexOf('.');
  const bracket = path.indexOf('[');
  if (dot === -1 && bracket === -1) {
    return path;
  }
  if (dot === -1) {
    return path.slice(0, bracket);
  }
  if (bracket === -1) {
    return path.slice(0, dot);
  }
  return path.slice(0, Math.min(dot, bracket));
};

/**
 * Builds a structured warning log entry from two JSON strings identifying
 * which fields were sanitized. Suitable for use with pino, winston, bunyan,
 * or any JSON-line logger.
 *
 * The warning entry carries all non-changed fields from the sanitized log
 * object (or only the fields named in `options.allowedFields` when provided),
 * overrides `level` to `40` (warn) and `msg` to a fixed warning string, and
 * adds a `fields` array listing the dot/bracket-notation paths that changed.
 *
 * Returns `null` when either string cannot be parsed as a JSON object, or
 * when no fields differ between the two inputs.
 *
 * @param originalStr - The original unsanitized JSON log string.
 * @param sanitizedStr - The sanitized JSON log string.
 * @param options - Optional configuration.
 * @returns A JSON warning log string, or `null` if no warning is needed.
 *
 * @example
 * buildSanitizedWarning(
 *   '{"level":30,"time":1,"pid":1,"hostname":"x","email":"a@b.com","msg":"hi"}',
 *   '{"level":30,"time":1,"pid":1,"hostname":"x","email":"**********","msg":"hi"}',
 * )
 * // => '{"time":1,"pid":1,"hostname":"x","level":40,"msg":"sensitive data found in log entry","fields":["email"]}'
 *
 * @example
 * // Restrict which fields carry over into the warning
 * buildSanitizedWarning(originalStr, sanitizedStr, { allowedFields: ['time', 'pid', 'hostname'] })
 */
const buildSanitizedWarning = (
  originalStr: string,
  sanitizedStr: string,
  options: BuildSanitizedWarningOptions = {},
): string | null => {
  let original: unknown;
  let sanitized: unknown;

  try {
    original = JSON.parse(originalStr);
    sanitized = JSON.parse(sanitizedStr);
  } catch {
    return null;
  }

  if (!isPlainObj(original) || !isPlainObj(sanitized)) {
    return null;
  }

  const fields = diffSanitizedFields(original, sanitized);
  if (fields.length === 0) {
    return null;
  }

  const changedTopLevelKeys = new Set(fields.map(topLevelKey));

  const { allowedFields } = options;
  const warning: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(sanitized)) {
    if (key === 'level' || key === 'msg' || changedTopLevelKeys.has(key)) {
      continue;
    }
    if (allowedFields === undefined || allowedFields.includes(key)) {
      warning[key] = value;
    }
  }

  warning.level = WARN_LEVEL;
  warning.msg = WARN_MSG;
  warning.fields = fields;

  return JSON.stringify(warning);
};

export { diffSanitizedFields, buildSanitizedWarning };
