# JSDoc & TSDoc Documentation Standards

JavaScript files (`.js`, `.mjs`) use **JSDoc** with explicit `{Type}`
annotations because JavaScript has no type system. TypeScript files (`.ts`,
`.tsx`) use **TSDoc** — types already live in the signatures, so type
annotations are omitted from doc tags.

## Core Principles (Both)

1. **Every exported function must have a doc comment** — No exceptions.
2. **Include function description** — Clear explanation of what it does.
3. **Add `@example` for functions with I/O** — Show actual usage patterns.
4. **Add `@throws` for explicit `throw` statements only** — Document every
   explicit `throw` statement with its specific error condition. Do not document
   implicit runtime errors (e.g. built-in `TypeError` from calling a method on
   the wrong type) or errors from called functions.

---

## JSDoc — JavaScript Files (`.js`, `.mjs`)

### Type Definition Rules

**Use `import()` for external types:**

```javascript
/**
 * @typedef {import('node:fs').Stats} FileStats
 * @typedef {import('./types.js').UserRecord} UserRecord
 */
```

**Define custom types as typedefs:**

```javascript
/**
 * @typedef {'low'|'medium'|'high'} Priority
 * @typedef {Object} QueryFilters
 * @property {string} [ownerId] - Owner identifier
 * @property {number} [page=1] - Page number
 */
```

**Array types: use `Type[]`, not `Array<Type>`:**

```javascript
@param {string[]} ids - User IDs
@returns {[number, number][]} Array of [min, max] pairs
```

### Complete Function Documentation

```javascript
/**
 * Retrieves records with optional pagination and filtering.
 *
 * @param {import('./repository.js').RecordRepository} repository - Data repository
 * @param {QueryFilters} filters - Filter criteria
 * @returns {Promise<import('./types.js').QueryResult>} Query results with metadata
 * @throws {Error} When data retrieval fails
 *
 * @example
 * const result = await getRecords(repository, { page: 1, limit: 50 })
 */
async function getRecords(repository, filters) {}
```

### Common Patterns

**Optional parameters with defaults:**

```javascript
@param {number} [page=1] - Page number
@param {boolean} [includeCounts=false] - Include counts
```

**Destructured object parameters:**

```javascript
/**
 * @param {Object} options
 * @param {string} options.name - User name
 * @param {boolean} [options.active] - Whether the user is active
 */
function createUser({ name, active }) {}
```

**Multiple accepted types:**

```javascript
@param {string|number} id - User ID
@returns {User|null} User object or null if not found
```

### Checklist

- [ ] Every exported function has JSDoc
- [ ] All params documented with `{Type}` and description
- [ ] Return type documented with `{Type}`
- [ ] Optional params marked with `[param]` or `[param=default]`
- [ ] Array element types specified: `{string[]}`
- [ ] Async functions return `{Promise<Type>}`
- [ ] `@throws` present for every throw statement
- [ ] `@example` present for functions with parameters or return values

---

## TSDoc — TypeScript Files (`.ts`, `.tsx`)

Types live in the TypeScript signature. Do **not** include `{Type}` in `@param`
or `@returns` — TypeScript already provides that information.

### Complete Function Documentation

```typescript
/**
 * Retrieves records with optional pagination and filtering.
 * Adds computed metadata needed by downstream consumers.
 *
 * @param repository - Data repository instance.
 * @param filters - Filter criteria for the query.
 * @returns Query results with metadata attached.
 * @throws {DataRetrievalError} When the data source is unavailable.
 *
 * @example
 * const result = await getRecords(repository, { page: 1, limit: 50 })
 */
async function getRecords(
  repository: RecordRepository,
  filters: QueryFilters,
): Promise<QueryResult> {}
```

### Generic Type Parameters

Document generic type parameters with `@typeParam`:

```typescript
/**
 * Wraps a value in an optional container.
 *
 * @typeParam T - The type of the wrapped value.
 * @param value - Value to wrap.
 * @returns The value wrapped in an optional container.
 */
function wrap<T>(value: T): Optional<T> {}
```

### Common Patterns

**Optional parameters:**

```typescript
/**
 * @param data - Data to sanitize.
 * @param options - Sanitization options. Uses defaults when omitted.
 */
function sanitize(data: unknown, options?: SanitizeOptions) {}
```

**Describe behavior, not type, in `@returns`:**

```typescript
// Bad: just restates the return type
@returns {string} string

// Good: describes what the value represents
@returns The sanitized string with all matched fields masked.
```

### Checklist

- [ ] Every exported function has a TSDoc comment
- [ ] No `{Type}` annotations on `@param` or `@returns`
- [ ] All parameters documented with name and description
- [ ] `@returns` describes the value, not the type
- [ ] `@throws` present for every throw statement
- [ ] `@typeParam` used for generic type parameters
- [ ] `@example` present for functions with parameters or return values

---

## Anti-Patterns (Both)

These patterns must **never** appear in doc comments:

**Do not document the absence of throws:**

```typescript
// BAD — documenting that nothing happens is noise
@throws Does not throw.

// GOOD — omit @throws entirely when the function does not throw
```

**Do not add `@returns` to constructors:**

```typescript
// BAD — constructors have no meaningful return value to document
constructor(message: string) {}
// @returns A MyClass instance.

// GOOD — omit @returns on constructors entirely
```

**`@returns` must describe the value, not restate the type:**

```typescript
// BAD
@returns string
@returns A string.

// GOOD
@returns The sanitized string with all matched fields masked.
```

**Do not document implicit or built-in throws:**

```typescript
// BAD — TypeError from .replace() is implicit; there is no throw statement
const escape = (s: string): string => s.replace(/x/g, '');
// @throws {TypeError} If s is not a string.

// GOOD — only document errors your code explicitly throws
// (no @throws needed here)
```
