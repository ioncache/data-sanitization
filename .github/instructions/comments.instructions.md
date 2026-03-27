---
applyTo: '**'
---

# Comments and Documentation

## Core Principles

1. **Default: no comment** — Add comments only when absolutely necessary.
2. **Only why, never what** — Explain the reason or decision, not what the code
   does
3. **Never comment about removed/refactored/changed code** — Comments describe
   present code only
4. **Never mention LLM actions** — Avoid phrases like "imported function", "removed code",
   "refactored", etc.
5. **Code should be self-documenting** — Prefer making code clearer over adding comments.

## When Comments Are Allowed

Add a why-comment only when the reader would genuinely struggle to understand
the decision without it:

- **Non-obvious decisions**: Why this approach over alternatives
- **Edge cases**: Why special handling is needed
- **Performance trade-offs**: Why we accept certain costs
- **Magic numbers**: Why this specific value

## Examples and Patterns

```javascript
// BAD: Describing what code does
// Loop through items and sum prices
const total = items.reduce((sum, item) => sum + item.price, 0);

// BAD: Redundant with function name
// Calculate the total
function calculateTotal() {}

// BAD: Describing removed code
// Removed the old validation logic

// BAD: Mentioning refactoring
// Refactored to use new helper function

// BAD: LLM action commentary
// Imported the helper function
// Updated this section per requirements

// GOOD: Explains WHY
// Using reduce instead of forEach to avoid mutation
const total = items.reduce((sum, item) => sum + item.price, 0);

// GOOD: Explains non-obvious decision
// 0.7 threshold balances precision/recall based on historical data analysis
const DETECTION_THRESHOLD = 0.7;
```

## Checklist

- [ ] No comment added unless truly necessary
- [ ] Comment explains why, never what
- [ ] No mention of removed/refactored/changed code
- [ ] No LLM action descriptions ("imported", "removed", "refactored")
- [ ] Comment is about present behavior only
- [ ] Could not make code clearer instead of commenting
