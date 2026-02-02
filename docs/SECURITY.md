# Security Guide

Security best practices, configuration guidelines, and audit checklist for the AI Bug Bounty Platform.

**Related Documentation**:
- [PRODUCTION.md](./PRODUCTION.md) - Production operations
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Security-related issues

---

## Table of Contents

- [Security Best Practices](#security-best-practices)
- [Authentication and Authorization](#authentication-and-authorization)
- [API Key Management](#api-key-management)
- [Environment Variable Security](#environment-variable-security)
- [Database Security](#database-security)
- [CORS Configuration](#cors-configuration)
- [Rate Limiting](#rate-limiting)
- [Input Validation](#input-validation)
- [SQL Injection Prevention](#sql-injection-prevention)
- [XSS Prevention](#xss-prevention)
- [Security Audit Checklist](#security-audit-checklist)
- [Vulnerability Disclosure Policy](#vulnerability-disclosure-policy)

---

## Security Best Practices

### General Principles

1. **Principle of Least Privilege**: Grant minimum permissions necessary
2. **Defense in Depth**: Multiple layers of security controls
3. **Secure by Default**: Security features enabled out-of-the-box
4. **Regular Updates**: Keep dependencies and systems patched
5. **Monitoring and Alerting**: Detect and respond to security events

### HTTPS/TLS Requirements

**Production Requirement**: All production traffic MUST use HTTPS/WSS.

```bash
# Backend configuration
FORCE_HTTPS=true
HSTS_ENABLED=true
HSTS_MAX_AGE=31536000  # 1 year

# Frontend configuration
VITE_API_URL=https://api.yourdomain.com/api/v1
VITE_WS_URL=wss://api.yourdomain.com
```

**TLS Configuration**:
- Minimum TLS version: 1.2
- Recommended: TLS 1.3
- Strong cipher suites only
- HSTS header enabled

### Security Headers

Implemented via Helmet middleware in `backend/src/server.ts`:

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.FRONTEND_URL],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  noSniff: true,
  xssFilter: true,
}));
```

---

## Authentication and Authorization

### JWT Token Security

**Token Configuration**:
```bash
# Strong secret (min 32 characters)
JWT_SECRET=...  # Generated with: openssl rand -base64 32

# Token expiration
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Token algorithm
JWT_ALGORITHM=HS256  # or RS256 for asymmetric
```

**Implementation** (`backend/src/middleware/auth.ts`):
```typescript
// Token includes:
// - User ID
// - Ethereum address
// - Issued at (iat)
// - Expiration (exp)
// - Signature

// Token is validated on every protected endpoint
```

### Ethereum Wallet Authentication

Secure signature verification:

```typescript
// Message format prevents replay attacks
const message = `Sign this message to authenticate with AI Bug Bounty Platform\n\nNonce: ${nonce}\nTimestamp: ${timestamp}`;

// Signature verified server-side
const recoveredAddress = ethers.utils.verifyMessage(message, signature);

// Nonce is single-use and expires after 5 minutes
```

### Role-Based Access Control (RBAC)

```typescript
// User roles
enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
  VALIDATOR = 'VALIDATOR',
}

// Protected endpoints require specific roles
@RequireRole(Role.ADMIN)
async function adminEndpoint() { }
```

---

## API Key Management

### Secret Storage

**NEVER commit secrets to Git**:

```bash
# ✅ Good - Environment variables
ANTHROPIC_API_KEY=sk-ant-...
MOONSHOT_API_KEY=...
PRIVATE_KEY=0x...

# ❌ Bad - Hardcoded in code
const apiKey = "sk-ant-...";  // NEVER DO THIS
```

### Secrets Management Solutions

**Option 1: Railway Secrets**
```bash
# Set secret via CLI
railway variables set ANTHROPIC_API_KEY=sk-ant-...

# Or via Railway dashboard
# Settings → Variables → Add Variable
```

**Option 2: HashiCorp Vault**
```bash
# Store secret
vault kv put secret/bugbounty/anthropic api_key=sk-ant-...

# Retrieve in application
const apiKey = await vault.read('secret/bugbounty/anthropic');
```

**Option 3: AWS Secrets Manager**
```bash
# Store secret
aws secretsmanager create-secret \
  --name bugbounty/anthropic-key \
  --secret-string sk-ant-...

# Retrieve in application
const { SecretString } = await secretsManager
  .getSecretValue({ SecretId: 'bugbounty/anthropic-key' })
  .promise();
```

### API Key Rotation

```bash
# Rotate API keys quarterly
# 1. Generate new key
# 2. Update environment variable
# 3. Deploy application
# 4. Revoke old key after 24 hours

# For blockchain private keys:
# 1. Generate new wallet
# 2. Transfer funds to new wallet
# 3. Update PRIVATE_KEY environment variable
# 4. Deploy application
# 5. Archive old wallet securely
```

### Key Access Audit

```bash
# Regularly audit who has access to secrets
railway team list
railway env list

# Review access logs
railway logs --filter "secrets accessed"
```

---

## Environment Variable Security

### Production Environment Files

```bash
# NEVER commit .env files
# Add to .gitignore:
.env
.env.local
.env.production
.env.*.local
```

### Environment Variable Validation

**Startup validation** (`backend/src/config/env.ts`):
```typescript
// Required variables are validated on startup
const requiredVars = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_SECRET',
  'PRIVATE_KEY',
];

requiredVars.forEach(varName => {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});

// Validate format
if (!/^0x[a-fA-F0-9]{64}$/.test(process.env.PRIVATE_KEY)) {
  throw new Error('PRIVATE_KEY must be a valid hex string');
}
```

### Sensitive Data Exposure Prevention

```typescript
// Filter sensitive data from logs
const sanitizeLog = (data: any) => {
  const sanitized = { ...data };
  const sensitiveKeys = ['privateKey', 'apiKey', 'password', 'secret', 'token'];

  Object.keys(sanitized).forEach(key => {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]';
    }
  });

  return sanitized;
};

logger.info(sanitizeLog({ protocolId: 'abc', apiKey: 'secret' }));
// Output: { protocolId: 'abc', apiKey: '[REDACTED]' }
```

---

## Database Security

### Connection Security

```bash
# Always use SSL/TLS for production
DATABASE_URL="postgresql://user:password@host:5432/bugbounty?sslmode=require"

# Verify SSL certificate
DATABASE_SSL_REJECT_UNAUTHORIZED=true
```

### Database User Permissions

```sql
-- Create application user with limited permissions
CREATE USER bugbounty_app WITH PASSWORD 'strong_password';

-- Grant only necessary permissions
GRANT CONNECT ON DATABASE bugbounty TO bugbounty_app;
GRANT USAGE ON SCHEMA public TO bugbounty_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bugbounty_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO bugbounty_app;

-- Revoke dangerous permissions
REVOKE CREATE ON SCHEMA public FROM bugbounty_app;
REVOKE DROP ON ALL TABLES IN SCHEMA public FROM bugbounty_app;
```

### Row-Level Security (RLS)

Enable RLS for sensitive tables:

```sql
-- Enable RLS on findings table
ALTER TABLE findings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own findings
CREATE POLICY findings_user_policy ON findings
  FOR SELECT
  USING (researcher_address = current_setting('app.current_user_address'));

-- Set user context in application
SET app.current_user_address = '0x...';
```

### Database Backup Encryption

```bash
# Encrypt backups at rest
pg_dump bugbounty | gpg --encrypt --recipient admin@yourdomain.com > backup.sql.gpg

# Decrypt when needed
gpg --decrypt backup.sql.gpg | psql bugbounty
```

---

## CORS Configuration

### Production CORS Settings

**Backend** (`backend/src/server.ts`):
```typescript
import cors from 'cors';

app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://yourdomain.com',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400, // 24 hours
}));
```

### Development vs Production

```bash
# Development - Allow all origins
FRONTEND_URL=http://localhost:5173,http://localhost:3000

# Production - Restrict to specific domain
FRONTEND_URL=https://yourdomain.com
```

### CORS Preflight Caching

```typescript
// Cache preflight requests for 24 hours
app.options('*', cors({ maxAge: 86400 }));
```

---

## Rate Limiting

### Implementation Details

**Global Rate Limit** (`backend/src/middleware/rate-limiter.ts`):
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests, please try again later.',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
});

app.use('/api', limiter);
```

### Endpoint-Specific Limits

```typescript
// Stricter limits for authentication
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5, // 5 login attempts per minute
  skipSuccessfulRequests: true, // Don't count successful requests
});

app.post('/api/v1/auth/login', authLimiter, loginHandler);
```

### Distributed Rate Limiting

```typescript
// Use Redis for distributed rate limiting
import RedisStore from 'rate-limit-redis';

const limiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rate-limit:',
  }),
  windowMs: 60 * 1000,
  max: 100,
});
```

---

## Input Validation

### Request Validation

Using Zod for schema validation:

```typescript
import { z } from 'zod';

// Protocol registration schema
const protocolSchema = z.object({
  name: z.string()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must not exceed 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Name contains invalid characters'),

  githubUrl: z.string()
    .url('Invalid URL format')
    .regex(/^https:\/\/github\.com\//, 'Must be a GitHub URL'),

  bountyPoolAddress: z.string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),

  network: z.enum(['base-sepolia', 'base-mainnet']),
});

// Validate request
app.post('/api/v1/protocols', async (req, res) => {
  try {
    const validated = protocolSchema.parse(req.body);
    // Process validated data
  } catch (error) {
    res.status(400).json({ error: error.errors });
  }
});
```

### File Upload Validation

```typescript
// Validate file uploads (if implemented)
const fileSchema = z.object({
  mimetype: z.enum(['image/png', 'image/jpeg', 'application/pdf']),
  size: z.number().max(5 * 1024 * 1024), // 5 MB max
});

// Scan for malware before processing
import clamscan from 'clamscan';
const { isInfected } = await clamscan.scanFile(file.path);
```

---

## SQL Injection Prevention

### Prisma ORM Protection

Prisma automatically prevents SQL injection:

```typescript
// ✅ Safe - Parameterized query
const protocol = await prisma.protocol.findUnique({
  where: { id: userInput },
});

// ✅ Safe - Prisma escapes all inputs
const protocols = await prisma.protocol.findMany({
  where: {
    name: { contains: searchQuery },
  },
});

// ❌ Never use raw SQL with user input
// If raw SQL is necessary, use parameterized queries:
const result = await prisma.$queryRaw`
  SELECT * FROM protocols WHERE name = ${userInput}
`;
```

### Dangerous Patterns to Avoid

```typescript
// ❌ NEVER concatenate user input into SQL
const query = `SELECT * FROM protocols WHERE name = '${userInput}'`;

// ❌ NEVER use eval() with user input
eval(userInput);

// ❌ NEVER execute shell commands with user input
exec(`git clone ${userInput}`);
```

---

## XSS Prevention

### React Built-in Protection

React automatically escapes output:

```tsx
// ✅ Safe - React escapes by default
<div>{userInput}</div>
<input value={userInput} />

// ⚠️ Dangerous - Bypasses React escaping
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

### Content Security Policy (CSP)

```typescript
// Helmet CSP configuration
contentSecurityPolicy: {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"], // For Tailwind
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'", process.env.FRONTEND_URL],
    fontSrc: ["'self'", "data:"],
    objectSrc: ["'none'"],
    upgradeInsecureRequests: [],
  },
}
```

### Sanitize User Content

```typescript
import DOMPurify from 'dompurify';

// If displaying user HTML, sanitize it first
const cleanHtml = DOMPurify.sanitize(userHtml, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p'],
  ALLOWED_ATTR: ['href'],
});
```

---

## Security Audit Checklist

### Pre-Production Audit

- [x] **Authentication**: JWT tokens with secure secrets, expiration configured
- [x] **Authorization**: Role-based access control implemented
- [x] **API Keys**: All secrets stored in environment variables, not in code
- [x] **Environment Variables**: Validated on startup, never committed to Git
- [x] **Database**: SSL/TLS enabled, user permissions restricted
- [x] **CORS**: Configured with specific allowed origins
- [x] **Rate Limiting**: Enabled on all API endpoints
- [x] **Input Validation**: All user inputs validated with Zod schemas
- [x] **SQL Injection**: Prisma ORM used, no raw SQL with user input
- [x] **XSS Prevention**: React escaping enabled, CSP configured
- [x] **HTTPS/TLS**: Enforced for all production traffic
- [x] **Security Headers**: Helmet middleware configured
- [x] **Dependency Scanning**: npm audit run and vulnerabilities addressed
- [x] **Error Handling**: No sensitive data exposed in error messages
- [x] **Logging**: Sensitive data filtered from logs
- [x] **Session Security**: Secure session cookies (httpOnly, secure, sameSite)
- [x] **Password Hashing**: bcrypt with 12 rounds (if applicable)
- [x] **Private Keys**: Secured in secrets manager, never in code
- [x] **Backup Encryption**: Database backups encrypted at rest
- [x] **Access Control**: Admin endpoints protected with authentication
- [x] **File Uploads**: Validated and scanned for malware (if implemented)

### Regular Security Tasks

**Monthly**:
- [ ] Run `npm audit` and update vulnerable dependencies
- [ ] Review Sentry for security-related errors
- [ ] Audit user access and permissions
- [ ] Review API access logs for suspicious activity
- [ ] Check SSL/TLS certificate expiration

**Quarterly**:
- [ ] Rotate API keys and secrets
- [ ] Perform penetration testing
- [ ] Review and update security policies
- [ ] Conduct security awareness training
- [ ] Test backup restoration procedures

**Annually**:
- [ ] Comprehensive security audit by third party
- [ ] Update disaster recovery plan
- [ ] Review and update incident response procedures
- [ ] Compliance audit (if applicable)

---

## Vulnerability Disclosure Policy

### Reporting a Security Vulnerability

We take security seriously. If you discover a security vulnerability, please report it responsibly.

**Contact**: security@yourdomain.com

**Please Include**:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

**Please DO NOT**:
- Publicly disclose the vulnerability before we've addressed it
- Attempt to exploit the vulnerability beyond proof-of-concept
- Access or modify user data without permission

### Response Timeline

- **Acknowledgment**: Within 24 hours
- **Initial Assessment**: Within 3 business days
- **Fix Development**: Severity-dependent (Critical: 7 days, High: 14 days, Medium: 30 days)
- **Disclosure**: After fix is deployed and users have time to update (typically 30 days)

### Responsible Disclosure

We follow responsible disclosure practices:
1. Report received and acknowledged
2. Vulnerability validated and assessed
3. Fix developed and tested
4. Security patch released
5. Public disclosure (after 30-90 days)

### Bug Bounty Program

We currently do NOT have a formal bug bounty program. However, we appreciate security researchers and may provide:
- Public acknowledgment (with permission)
- Swag or tokens for significant findings
- Faster track for future employment opportunities

### Hall of Fame

Security researchers who have responsibly disclosed vulnerabilities:
- (None yet - be the first!)

---

## Security Incident Response

### Incident Response Plan

**1. Detection**:
- Monitoring alerts (Sentry, UptimeRobot)
- User reports
- Security scans

**2. Assessment**:
- Severity classification (Critical, High, Medium, Low)
- Impact analysis (data breach, service disruption, etc.)
- Root cause identification

**3. Containment**:
- Isolate affected systems
- Revoke compromised credentials
- Block malicious IP addresses

**4. Remediation**:
- Deploy security patch
- Update configurations
- Strengthen security controls

**5. Recovery**:
- Restore from backups if necessary
- Verify system integrity
- Resume normal operations

**6. Post-Incident**:
- Incident report
- Lessons learned
- Update security procedures

### Emergency Contacts

**Security Team**: security@yourdomain.com
**On-Call Engineer**: oncall@yourdomain.com
**Management Escalation**: management@yourdomain.com

---

**Last Updated**: 2026-02-01
