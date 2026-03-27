---
applyTo: '**/*.js,**/*.jsx,**/*.ts,**/*.tsx'
---

# JSDoc Documentation Standards

## Core Principles

1. **Every function must have JSDoc** — No exceptions.
2. **No inline type definitions** — Use typedefs or imported types.
3. **Import types from packages** — Use `import('package').Type` syntax
4. **Include function description** — Clear explanation of what it does
5. **Add @example for functions with I/O** — Show actual usage patterns
6. **Add @throws for each error type** — Document every throw statement with
   specific error condition

## Type Definition Rules

**Use `import()` for external types:**

```javascript
/**
 * @typedef {import('node:fs').Stats} FileStats
 * @typedef {import('node:http').IncomingHttpHeaders} IncomingHttpHeaders
 * @typedef {import('./types.js').UserRecord} UserRecord
 */
```

**Define custom types as typedefs:**

```javascript
/**
 * @typedef {'low'|'medium'|'high'} Priority
 * @typedef {Object} QueryFilters
 * @property {string} [ownerId] - Owner identifier
 * @property {string} [status] - Optional status filter
 * @property {number} [page=1] - Page number
 * @property {number} [limit=100] - Items per page
 */
```

**Use `[...]` for arrays, not `Array<...>`:**

```javascript
@param {[number, number][]} ranges - Array of [min, max] pairs
@returns {string[]} Array of user IDs
```

## Complete Function Documentation

Every function should include:

1. **Description** — What the function does
2. **@param** — All parameters with imported/typedef types
3. **@returns** — Return type (use `Promise<Type>` for async)
4. **@throws** — Document error conditions
5. **@example** — Usage example for functions with parameters or return values

```javascript
/**
 * Retrieves records with optional pagination and filtering.
 * Adds computed metadata needed by downstream consumers.
 *
 * @param {import('./repository.js').RecordRepository} repository - Data repository
 * @param {QueryFilters} filters - Filter criteria
 * @param {import('./logger.js').Logger} logger - Logger instance
 * @returns {Promise<import('./types.js').QueryResult>} Query results with metadata
 * @throws {Error} When data retrieval fails
 * @throws {Error} When response shaping fails
 *
 * @example
 * // Get records with pagination
 * const result = await getRecords(repository, {
 *   ownerId: 'user-123',
 *   page: 1,
 *   limit: 50
 * }, logger)
 *
 * @example
 * // Get records within a date range
 * const result = await getRecords(repository, {
 *   ownerId: 'user-456',
 *   start_date: '2025-01-01T00:00:00Z',
 *   end_date: '2025-01-31T23:59:59Z'
 * }, logger)
 */
async function getRecords(repository, filters, logger) {
  // Implementation
}
```

## Common Patterns

**Optional parameters with defaults:**

```javascript
@param {number} [page=1] - Page number
@param {boolean} [include_counts=false] - Include counts
```

**Multiple type options:**

```javascript
@param {string|number} id - User ID
@returns {User|null} User object or null if not found
```

**Destructured parameters:**

```javascript
/**
 * @param {Object} options
 * @param {string} options.ownerId - Owner identifier
 * @param {boolean} [options.includeCounts] - Include counts
 */
function process({ ownerId, includeCounts }) {}
```

**Callback/function types:**

```javascript
@param {(error: Error|null, result: any) => void} callback
```

## Checklist

When documenting types, verify:

- [ ] Types match actual data passed to function
- [ ] Return types match actual returned data
- [ ] Optional params marked with `[param]` or `[param=default]`
- [ ] Nullable types marked with `|null` or `|undefined`
- [ ] Union types used for multiple accepted types
- [ ] No inline `Object` — use typedef or imported type
- [ ] Array element types specified: `[ElementType]`
- [ ] Async functions return `Promise<Type>`
