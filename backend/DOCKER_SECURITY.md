# Docker Security Configuration Guide

## Environment Variable Security

This project uses environment variables for sensitive configuration to prevent credential leakage in version control.

### 🔒 Security Best Practices

#### 1. Never Commit Secrets to Git

**Protected Files (in .gitignore):**
- `.env.local` - Your local development secrets
- `.env.*.local` - Environment-specific secrets
- `.env` - Production secrets

**Safe Files (committed to git):**
- `.env.docker.example` - Template with example values
- `docker-compose.yml` - References environment variables

#### 2. Environment Variable Pattern

We use the **fallback pattern** for Docker Compose:

```yaml
environment:
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-default_value}
```

**How it works:**
- If `POSTGRES_PASSWORD` is set in `.env.local`, it uses that value
- If not set, it falls back to `default_value`
- Default values are **only for local development**
- **Never use defaults in production**

### 🚀 Setup Instructions

#### Local Development Setup

1. **Copy the environment template:**
   ```bash
   cp .env.docker.example .env.local
   ```

2. **Update credentials in `.env.local`:**
   ```bash
   # PostgreSQL (Local Development)
   POSTGRES_USER=thunder
   POSTGRES_PASSWORD=your_secure_password_here  # ⚠️ Change this!
   POSTGRES_DB=thunder_security

   # Supabase (get from dashboard)
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

3. **Start Docker services:**
   ```bash
   npm run docker:up
   ```

4. **Verify environment variables loaded:**
   ```bash
   docker-compose config | grep POSTGRES_PASSWORD
   # Should show your custom password, not the default
   ```

### 🔐 Production Deployment

#### Railway / Cloud Platforms

**Never use docker-compose.yml in production.** Instead:

1. **Set environment variables in platform dashboard:**
   - Railway: Settings → Variables
   - Heroku: Settings → Config Vars
   - AWS ECS: Task Definition → Environment Variables

2. **Required production variables:**
   ```
   DATABASE_URL=postgresql://user:password@host:5432/db
   REDIS_URL=redis://:password@host:6379
   SUPABASE_URL=https://...
   SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   FRONTEND_URL=https://your-domain.com
   NODE_ENV=production
   ```

3. **Use managed services:**
   - ✅ Railway PostgreSQL addon (auto-injects DATABASE_URL)
   - ✅ Railway Redis addon (auto-injects REDIS_URL)
   - ✅ Supabase managed database
   - ❌ Don't run PostgreSQL in Docker for production

### 📋 Environment Variables Reference

#### PostgreSQL Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `POSTGRES_USER` | Local only | `thunder` | PostgreSQL username |
| `POSTGRES_PASSWORD` | **Yes** | `<your-postgres-password>` | PostgreSQL password (⚠️ CHANGE THIS) |
| `POSTGRES_DB` | Local only | `thunder_security` | Database name |

**Security Notes:**
- Change `POSTGRES_PASSWORD` immediately in `.env.local`
- Use strong passwords (16+ characters, mixed case, numbers, symbols)
- Never reuse passwords across environments

#### Redis Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REDIS_PASSWORD` | **Yes** | `<your-redis-password>` | Redis authentication password (⚠️ CHANGE THIS) |

**Security Notes:**
- Change `REDIS_PASSWORD` immediately in `.env.local`
- Redis password protects cache from unauthorized access on docker network
- Use different password from PostgreSQL
- Production: Railway Redis addon auto-generates secure password

#### Supabase Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SUPABASE_URL` | **Yes** | - | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | **Yes** | - | Public anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | - | Service role key (⚠️ SECRET) |

**Security Notes:**
- Get keys from: https://supabase.com/dashboard/project/_/settings/api
- `SERVICE_ROLE_KEY` bypasses RLS - never expose to frontend
- Rotate keys if compromised

### 🛡️ Security Checklist

Before deploying to production:

- [ ] All secrets removed from docker-compose.yml
- [ ] `.env.local` added to `.gitignore`
- [ ] Strong passwords generated (not defaults)
- [ ] Environment variables set in cloud platform dashboard
- [ ] `NODE_ENV=production` set
- [ ] Database credentials rotated from defaults
- [ ] Supabase keys confirmed valid
- [ ] No hardcoded secrets in codebase (`git log -p | grep -i password`)

### 🚨 What to Do If Secrets Are Exposed

If you accidentally commit secrets to git:

1. **Immediately rotate all credentials:**
   - Change PostgreSQL password
   - Regenerate Supabase keys
   - Update Railway environment variables

2. **Remove from git history:**
   ```bash
   # Use BFG Repo-Cleaner or git filter-branch
   # This is complex - contact DevOps if needed
   ```

3. **Force push cleaned history:**
   ```bash
   git push --force
   ```

4. **Notify team:**
   - Inform all developers to re-clone repository
   - Update CI/CD pipelines with new secrets

### 📚 Additional Resources

- [Docker Secrets Management](https://docs.docker.com/engine/swarm/secrets/)
- [12-Factor App - Config](https://12factor.net/config)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

---

**Last Updated:** 2026-01-30 by docker-expert skill
**Related:** See `DOCKER_VALIDATION_REPORT.md` for full security audit
