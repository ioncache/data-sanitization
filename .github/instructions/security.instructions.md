---
applyTo: '**'
---

# Security Guidelines

## Core Principles

1. **Validate at the edge** — Validate request shape and value constraints on all external inputs.
2. **Sanitize untrusted content** — Sanitize user-provided markup and normalize text input.
3. **Verify signatures** — Verify signatures for all inbound webhooks or callbacks.
4. **Use safe identifier conversion** — Parse and validate untrusted IDs with strict checks and try/catch.
5. **Fail securely** — Log internal details server-side and return generic client errors.
6. **Least privilege** — Restrict access with explicit authorization policies.
7. **Secrets in environment only** — Validate required secrets at startup and never hardcode credentials.

## Input Validation

**Every endpoint should validate request body, params, and query values:**

```javascript
// Good: Validate request before business logic
const schema = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: { type: 'string', format: 'email' },
    password: { type: 'string', minLength: 8 },
  },
};

function createUserHandler(request, response) {
  const { valid, errors } = validate(schema, request.body);
  if (!valid) {
    return response.status(400).json({ error: 'Invalid request payload' });
  }

  const { email, password } = request.body;
  return response.status(201).json({ email });
}

// Bad: No validation
function createUserHandlerUnsafe(request, response) {
  const { email, password } = request.body; // Unsafe
  return response.status(201).json({ email, password });
}
```

## Security Headers

**Set defensive security headers for all HTTP responses:**

```javascript
function applySecurityHeaders(response) {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Content-Security-Policy', "default-src 'self'");
}
```

## Safe Identifier Handling

**Always validate identifier format before database access:**

```javascript
function parseStrictId(id) {
  if (!/^[a-f0-9]{24}$/i.test(id)) {
    throw new Error('Invalid ID format');
  }
  return id.toLowerCase();
}

function findById(id, repository) {
  try {
    const safeId = parseStrictId(id);
    return repository.findOne({ id: safeId });
  } catch {
    return null;
  }
}
```

## Webhook Signature Verification

**Always verify webhook signatures before processing payloads:**

```javascript
import crypto from 'node:crypto';

function verifyWebhookSignature({ payload, signature, secret }) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature || ''),
  );
}

function handleWebhook(request, response, secret) {
  const signature = request.headers['x-signature'];
  const valid = verifyWebhookSignature({
    payload: request.rawBody,
    signature,
    secret,
  });

  if (!valid) {
    return response.status(401).json({ error: 'Invalid signature' });
  }

  return response.status(200).json({ ok: true });
}
```

## Authentication and Authorization

**Protect private routes and authorize by capability/role:**

```javascript
function requireAuth(request) {
  if (!request.user) {
    throw new Error('Unauthorized');
  }
}

function requirePermission(user, permission) {
  if (!user.permissions.includes(permission)) {
    throw new Error('Forbidden');
  }
}

function createAdminUser(request, response) {
  requireAuth(request);
  requirePermission(request.user, 'users:create');
  return response.status(201).json({ ok: true });
}
```

## Data Protection

### Rate Limiting

```javascript
function createRateLimiter({ max, windowMs }) {
  const hits = new Map();

  return function allow(ip, now = Date.now()) {
    const slot = hits.get(ip) || [];
    const recent = slot.filter((ts) => now - ts < windowMs);
    if (recent.length >= max) return false;
    recent.push(now);
    hits.set(ip, recent);
    return true;
  };
}
```

### Input Sanitization

**Sanitize untrusted user content before persistence or rendering:**

```javascript
function sanitizeInput(value) {
  if (typeof value === 'string') {
    return value.replace(/[<>]/g, '');
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeInput);
  }
  if (value && typeof value === 'object') {
    const next = {};
    for (const [key, item] of Object.entries(value)) {
      next[key] = sanitizeInput(item);
    }
    return next;
  }
  return value;
}
```

### Environment Variables and Secrets

**Define and validate all required environment variables at startup:**

```javascript
const requiredEnv = ['JWT_SIGNING_KEY', 'WEBHOOK_SIGNING_SECRET'];

function validateEnvironment(env = process.env) {
  for (const key of requiredEnv) {
    if (!env[key] || env[key].trim() === '') {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}
```

## Error Handling

**Never expose internal details to external clients:**

```javascript
try {
  await riskyOperation();
} catch (error) {
  logger.error({ error }, 'Operation failed');
  return response.status(500).json({ error: 'Internal server error' });
}
```

## Checklist

- [ ] Input validation on all external inputs
- [ ] Authentication and authorization on protected routes
- [ ] Rate limiting on externally accessible APIs
- [ ] Security headers configured
- [ ] Error responses avoid internal details
- [ ] Injection/XSS mitigations in place
- [ ] Webhook signatures verified before processing
- [ ] ID parsing and conversion wrapped in strict validation
- [ ] Untrusted input sanitized before storage/rendering
- [ ] Secrets loaded only from environment variables
- [ ] No sensitive data in logs
