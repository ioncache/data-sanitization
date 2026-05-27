# Unit Testing Standards (Vitest)

**Applies to:** JavaScript/TypeScript tests. Other language test guidance is out of scope.

## Core Principles

1. Use Arrange, Act, and Assert comments for non-trivial tests; add Revert only
   when the test performs cleanup
2. Aim for 100% coverage; use `/* istanbul ignore next */` with justification
3. BDD format: `describe()` blocks + `it()` (never use `test()`)
4. Test titles should start with `should` and describe behavior
5. Location: follow the repository's established test layout and naming patterns

## Test Structure

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { functionToTest } from './moduleToTest';

describe('moduleToTest.js', () => {
  describe('functionToTest', () => {
    it('should do something specific when given certain input', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = functionToTest(input);

      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

## Coverage & Mocking

**Coverage:** Use `/* istanbul ignore next */` only when necessary (error
boundaries, third-party code, platform-specific, E2E-tested UI). Add comment
explaining why.

**Mocking:** Avoid when possible. If needed, mock at lowest level and document
why. Prefer refactoring for testability:

```javascript
// Before: requires mocking Date
function getCurrentTime() {
  return new Date().toISOString();
}

// After: testable via dependency injection
function getCurrentTime(date = new Date()) {
  return date.toISOString();
}
```

## Test Execution

After any test file change (new tests, edits, refactors):

1. Run the modified test file
2. Fix failures
3. Repeat until green

Do not consider test changes complete until tests pass.

## BDD Format Requirements

- Use `describe()` for context and unit under test
- Use `it()` for test cases (never use `test()`)
- Titles should start with `should` + observable behavior
- One behavior per test when possible

```javascript
describe('Calculator', () => {
  describe('add', () => {
    it('should return sum of two positive numbers', () => {});
    it('should handle negative numbers correctly', () => {});
    it('should throw error for non-numeric input', () => {});
  });
});
```

### `describe()` strings

**Outer block:** the module or unit under test (function name, class name, or
file name).

**Nested blocks:** use `when`, `with`, or `given` to introduce scenario context.
This reads naturally when combined with the parent: "Calculator > add > when
the inputs are negative > should return a negative sum."

```javascript
// Good
describe('sanitizeData', () => {
  describe('with string input', () => { ... });
  describe('when removal is enabled', () => { ... });
  describe('when configured with custom options', () => { ... });
});

// Bad: vague or technical
describe('masking', () => { ... });       // no unit context
describe('options', () => { ... });       // not a scenario
describe('parseJsonStrings option', () => { ... }); // names the option, not the scenario
```

### `it()` strings

Write from the **caller's perspective**. Describe what the system does in
observable terms (what comes out, what changes, what error is thrown), not
what the code does internally.

**Ask:** "What does the caller care about?" not "What does the code do?"

```javascript
// Good: describes output the caller observes
it('should mask sensitive fields in a JSON string', () => {});
it('should leave class instances unchanged', () => {});
it('should throw an error when given a number', () => {});
it('should apply a caller-supplied mask string', () => {});

// Bad: describes internal mechanics
it('should call stringReplacer on the input', () => {}); // internal function
it('should iterate the WeakSet for circular refs', () => {}); // implementation detail
it('should construct a global case-insensitive regex', () => {}); // mechanism, not outcome
it('should set name and details on custom error', () => {}); // describes object state, not behavior
```

### Description anti-patterns to avoid

| Anti-pattern                           | Example                                                                                  | Better                                                                            |
| -------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Names internal function                | `should call objectReplacer`                                                             | `should mask sensitive fields in the object`                                      |
| Names the option, not the effect       | `when parseJsonStrings is true`                                                          | `when JSON string parsing is enabled`                                             |
| Uses implementation jargon             | `should not consume the CR in a CRLF sequence`                                           | `should stop at Windows-style line endings without including the carriage return` |
| Uses "top-level" as a location         | `should sanitize top-level object input`                                                 | `should mask sensitive fields in an object`                                       |
| Calls objects "non-plain"              | `should preserve non-plain object input`                                                 | `should return class instances unchanged`                                         |
| Uses regex terminology                 | `should produce a removal regex that…`                                                   | `should remove the matched field and its value`                                   |
| Uses "null" as a descriptor            | `should return null warning when…`                                                       | `should produce no warning when…`                                                 |
| Describes notation instead of behavior | `should return bracket-notation paths`                                                   | `should return indexed paths for array elements`                                  |
| Redundant qualifier in nested context  | `it('should mask X when option is enabled')` inside `describe('when option is enabled')` | drop the qualifier from `it()`                                                    |

## AAA and Revert Comments

Use in every non-trivial test:

- `// Arrange`: setup/given
- `// Act`: when
- `// Assert`: then

Use only when cleanup is actually performed:

- `// Revert`: cleanup local test state, mocks, timers, files, or other side
  effects not handled by `afterEach`

Simple tests with obvious steps may omit these.

## Example Test

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { processRanges } from './labResults';

describe('labResults.js', () => {
  describe('processRanges', () => {
    let ranges, value, options;

    beforeEach(() => {
      // Arrange
      ranges = {
        optimal: [[0, 10]],
        warning: [[11, 20]],
        danger: [[21, 30]],
      };
      value = 15;
      options = {};
    });

    it('should return correct range info for value in warning range', () => {
      // Act
      const result = processRanges(ranges, value, options);

      // Assert
      expect(result.activeRange.type).toBe('warning');
      expect(result.percent).toBeGreaterThan(0);
      expect(result.percent).toBeLessThan(100);
    });

    it('should handle null ranges gracefully', () => {
      // Arrange
      ranges = null;

      // Act
      const result = processRanges(ranges, value, options);

      // Assert
      expect(result.noRanges).toBe(true);
      expect(result.percent).toBe(50);
    });
  });
});
```

## Checklist

- [ ] Tests use `describe()` and `it()`
- [ ] Outer `describe()` names the module or unit under test
- [ ] Nested `describe()` blocks use `when`, `with`, or `given` for scenario context
- [ ] `it()` titles start with `should`
- [ ] `it()` titles describe observable behavior from the caller's perspective
- [ ] `it()` titles contain no implementation details (internal function names,
      option names, regex concepts, data structure internals, notation style names)
- [ ] Arrange, Act, and Assert comments are present in non-trivial tests
- [ ] Revert comments are present only when the test performs cleanup
- [ ] Coverage exceptions include justification comments
- [ ] Modified tests are run and passing
