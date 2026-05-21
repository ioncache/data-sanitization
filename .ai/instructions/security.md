# Security Guidelines

## Core Principles

1. **Never expose data in errors** — Error messages must not contain the
   original input payload. Use type labels or error categories only.
2. **Validate inputs at library boundaries** — Check that inputs match expected
   types before processing. Fail fast with a typed error.
3. **Guard against ReDoS** — Regex patterns that process untrusted input must
   avoid catastrophic backtracking. Test patterns against worst-case inputs.
4. **Handle circular references safely** — When recursing into objects, track
   visited nodes to prevent infinite loops and stack overflows.
5. **Validate custom patterns** — User-provided pattern strings are untrusted
   input. Validate or escape before passing to `RegExp`.
6. **No hardcoded credentials** — Never commit tokens, keys, or secrets to
   source. Read secrets from environment variables.
7. **Minimal dependency surface** — Keep dependencies minimal. Audit for known
   vulnerabilities regularly.

## Data Safety in Errors

**Never include the original value in thrown errors or error details:**

```typescript
// Bad: exposes the payload
throw new Error(`Cannot sanitize value: ${JSON.stringify(data)}`);

// Good: only exposes the type
throw new DataSanitizationError(
  `Cannot sanitize value of type: ${getInputType(data)}`,
);
```

**Use type labels, not values, in all diagnostic output:**

```typescript
function getInputType(data: unknown): string {
  if (data === null) return 'null';
  if (Array.isArray(data)) return 'array';
  return typeof data;
}
```

## Input Validation at Library Boundaries

**Check types before processing and throw typed errors early:**

```typescript
// Good: validate before recursing
function sanitizeObject(data: unknown): unknown {
  if (data === null || typeof data !== 'object') {
    throw new DataSanitizationError(
      `Expected object, got ${getInputType(data)}`,
    );
  }
  return processObject(data);
}
```

## ReDoS Protection

**Avoid patterns with nested quantifiers or overlapping alternations on
untrusted input:**

```typescript
// Risky: nested quantifiers can cause catastrophic backtracking
const unsafe = /^(a+)+$/;

// Safe: linear patterns with clear boundaries
const safe = /^a+$/;
```

**Test custom patterns against long repeated inputs before using them:**

```typescript
// Validate performance before accepting a user pattern
function benchmarkPattern(pattern: RegExp, worstCase: string): void {
  const start = Date.now();
  pattern.test(worstCase);
  if (Date.now() - start > 100) {
    throw new Error('Pattern too slow on worst-case input');
  }
}
```

## Circular Reference Safety

**Track visited nodes with a `WeakSet` when recursing into objects:**

```typescript
// Bad: unbounded recursion
function recurse(obj: Record<string, unknown>): void {
  for (const key of Object.keys(obj)) {
    recurse(obj[key] as Record<string, unknown>);
  }
}

// Good: circular reference guard
function recurse(obj: Record<string, unknown>, seen = new WeakSet()): void {
  if (seen.has(obj)) return;
  seen.add(obj);
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val && typeof val === 'object') {
      recurse(val as Record<string, unknown>, seen);
    }
  }
}
```

## Custom Pattern Validation

**Treat user-provided pattern strings as untrusted. Validate before use:**

```typescript
// Bad: user string passed directly to RegExp
const pattern = new RegExp(userInput);

// Good: validate the pattern string first
function validatePatternString(input: string): void {
  if (!/^[a-z][a-z0-9_]*$/i.test(input)) {
    throw new DataSanitizationError(`Invalid pattern: ${input}`);
  }
}
```

## Environment Variables and Secrets

**Read secrets from environment variables. Never hardcode them:**

```typescript
// Bad: hardcoded secret
const apiKey = 'sk-abc123';

// Good: read from environment
const apiKey = process.env.API_KEY;
if (!apiKey) throw new Error('Missing required env var: API_KEY');
```

## Checklist

- [ ] No original data values in error messages or details
- [ ] Inputs validated at library boundaries before processing
- [ ] Regex patterns tested for ReDoS on worst-case inputs
- [ ] Circular references handled with `WeakSet` guards
- [ ] User-provided pattern strings validated before `RegExp` construction
- [ ] No hardcoded tokens, keys, or secrets in source
- [ ] Dependencies audited for known vulnerabilities
