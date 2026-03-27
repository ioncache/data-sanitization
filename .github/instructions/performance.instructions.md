---
applyTo: '**'
---

# Performance Guidelines

## Core Principles

1. **Readability first** — Optimize only when needed
2. **Profile before optimizing** — Measure, don't guess
3. **Document performance-critical code** — Explain why optimizations exist
4. **Split large files** — Break into focused modules when exceeding 300 lines

## Memory Management

**Always clean up resources:**

```javascript
// Good: Cleanup event listeners
function startWatcher(target) {
  const onChange = () => {
    /* ... */
  };
  target.addEventListener('change', onChange);
  return () => target.removeEventListener('change', onChange);
}

// Good: Cleanup timers
const timer = setInterval(runWork, 1000);
clearInterval(timer);
```

## Compute Optimization

**Cache expensive calculations when inputs are stable:**

```javascript
const cache = new Map();

function computeDigest(input) {
  if (cache.has(input)) return cache.get(input);
  const result = expensiveOperation(input);
  cache.set(input, result);
  return result;
}
```

## Code Splitting

**Lazy load heavy modules:**

```javascript
async function loadAnalyzer() {
  const { analyze } = await import('./analyzer.js');
  return analyze;
}
```

## Checklist

- [ ] Event listeners and timers cleaned up
- [ ] Large objects released when no longer needed
- [ ] Expensive calculations cached where beneficial
- [ ] Heavy modules lazy loaded where practical
- [ ] Files split when exceeding 300 lines
- [ ] Code profiled before optimization
- [ ] Performance-critical code documented
