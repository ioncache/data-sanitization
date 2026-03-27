---
applyTo: '**'
---

# Code Complexity Guidelines

## Core Principles

1. Functions should be small, focused, and do one thing well
2. Prefer readability over strict metrics
3. Functions should be pure when possible
4. Avoid side effects and global state dependencies

## Hard Limits

- **Max 3 parameters** — use object parameter for >3 params or boolean flags
- **Max 3 nesting levels** — use early returns and guard clauses
- **Target <30 lines per function** — longer OK if cohesive and clear
- **Target cyclomatic complexity <15** — higher OK if logic is simple and
  related

## Examples and Patterns

**Use early returns to reduce nesting:**

```javascript
// Bad: Deep nesting
function process(order) {
  if (order.isValid) {
    if (order.items.length > 0) {
      if (order.customer.isActive) {
        return doWork(order);
      }
    }
  }
  return null;
}

// Good: Guard clauses
function process(order) {
  if (!order.isValid) return null;
  if (order.items.length === 0) return null;
  if (!order.customer.isActive) return null;
  return doWork(order);
}
```

**Use object parameters for related data:**

```javascript
// Bad: Too many params
function createUser(name, email, age, address, phone) {}

// Good: Grouped params
function createUser(userData) {
  const { name, email, age, address, phone } = userData;
}
```

**Extract complex logic into focused functions:**

```javascript
// Bad: Multiple responsibilities
function processUserData(user) {
  validateUser(user);
  updateDatabase(user);
  sendWelcomeEmail(user);
  createUserProfile(user);
}

// Good: Composed from smaller functions
function processUserData(user) {
  validateUser(user);
  const dbUser = updateDatabase(user);
  notifyUser(dbUser);
}
```

## Checklist

- [ ] Single responsibility
- [ ] ≤3 parameters
- [ ] ≤3 nesting levels
- [ ] Clear, descriptive names
- [ ] No global state dependencies
