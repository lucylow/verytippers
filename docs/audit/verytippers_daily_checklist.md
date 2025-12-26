# VeryTippers Daily Audit Checklist

**Date**: December 25, 2025  
**Purpose**: Quick daily reference, priority matrix, and Cursor commands  
**Time**: 5-10 minutes per day

---

## 🚀 Quick Start (Daily)

### Morning Routine (5 minutes)
1. [ ] Run linter: `pnpm lint`
2. [ ] Run tests: `pnpm test`
3. [ ] Check error logs: `tail -f logs/error.log`
4. [ ] Review yesterday's commits for security issues

### Evening Routine (5 minutes)
1. [ ] Commit today's changes
2. [ ] Update audit progress in this checklist
3. [ ] Review tomorrow's priorities

---

## 🔴 Critical Priority (Do First)

These issues block production deployment:

- [ ] **Pattern #1**: Encryption Implementation (AES-256-GCM)
- [ ] **Pattern #2**: Private Key Management (KMS)
- [ ] **Pattern #3**: Signature Verification (EIP-191/EIP-712)
- [ ] **Pattern #4**: Nonce Tracking (Replay Prevention)
- [ ] **Pattern #5**: Rate Limiting (Redis)

**Reference**: `verytippers_critical_patterns.md`

---

## 🟠 High Priority (Do Next)

These issues are important for production quality:

- [ ] **Pattern #6**: Input Validation (Zod schemas)
- [ ] **Pattern #7**: Error Handling (try-catch, retries)
- [ ] **Pattern #8**: SQL Injection Prevention (Prisma)
- [ ] Database indexes optimized
- [ ] Test coverage > 80%

**Reference**: `verytippers_critical_patterns.md`

---

## 🟡 Medium Priority (Do Soon)

These improve code quality and operations:

- [ ] **Pattern #9**: Database Transactions (atomicity)
- [ ] **Pattern #10**: Structured Logging (Winston)
- [ ] Monitoring set up (Prometheus)
- [ ] Health checks on all endpoints
- [ ] Documentation updated

**Reference**: `verytippers_critical_patterns.md`

---

## 📋 Phase Checklist

### Phase 1: Structural ✅ / ⬜
- [ ] Repository layout correct
- [ ] Dependencies pinned
- [ ] Environment configured
- [ ] TypeScript strict mode enabled
- [ ] Docker builds without errors

### Phase 2: Frontend ✅ / ⬜
- [ ] Type safety (no `any`)
- [ ] React best practices
- [ ] Wallet integration secure
- [ ] Error handling implemented
- [ ] Bundle size < 500KB

### Phase 3: Backend ✅ / ⬜
- [ ] Input validation (Zod)
- [ ] Error handling (try-catch)
- [ ] Rate limiting (Redis)
- [ ] Encryption (AES-256-GCM)
- [ ] Nonce tracking
- [ ] Signature verification

### Phase 4: Smart Contracts ✅ / ⬜
- [ ] Signature verification (EIP-191)
- [ ] Nonce replay protection
- [ ] Event emission
- [ ] No integer overflow
- [ ] No re-entrancy

### Phase 5: Infrastructure ✅ / ⬜
- [ ] Dockerfile security
- [ ] Secrets management (KMS)
- [ ] Resource limits
- [ ] Health checks

### Phase 6: Testing ✅ / ⬜
- [ ] Unit tests > 80% coverage
- [ ] Integration tests
- [ ] Error case tests
- [ ] Edge case tests

### Phase 7: Deployment ✅ / ⬜
- [ ] Staging tested
- [ ] Production checklist
- [ ] Monitoring configured
- [ ] Incident playbook

**Reference**: `verytippers_cursor_prompt.md`

---

## 💻 Quick Cursor Commands

### Find Security Issues

```
Search the codebase for private keys or secrets. Look for:
1. Hardcoded private keys
2. .env files with secrets
3. Console.log statements with sensitive data
4. API keys in code
```

### Check Encryption

```
Show me all encryption/decryption functions in the codebase.
Verify they use AES-256-GCM with random IVs.
Check if IVs are stored with encrypted data.
```

### Verify Signature Verification

```
Find all meta-transaction handling code.
Verify that user signatures are checked before relaying.
Check for EIP-191 or EIP-712 signature verification.
```

### Check Rate Limiting

```
Find all API endpoints.
Verify they have rate limiting middleware.
Check Redis rate limiting implementation.
```

### Review Error Handling

```
Search for async/await code without try-catch blocks.
Check for unhandled promise rejections.
Verify error logging is implemented.
```

---

## 🔍 Daily Security Checks

### Code Review Checklist
- [ ] No private keys in code
- [ ] No secrets in logs
- [ ] All inputs validated
- [ ] All signatures verified
- [ ] Rate limiting enforced
- [ ] Encryption used correctly
- [ ] SQL injection prevented
- [ ] XSS prevented

### Dependency Check
```bash
# Check for vulnerabilities
pnpm audit

# Update dependencies
pnpm update
```

### Test Coverage
```bash
# Run tests with coverage
pnpm test --coverage

# Target: >80% coverage
```

---

## 📊 Progress Tracking

### Week 1 Progress
- [ ] Day 1: Encryption implementation
- [ ] Day 2: Private key management (KMS)
- [ ] Day 3: Signature verification
- [ ] Day 4: Nonce tracking
- [ ] Day 5: Rate limiting

### Week 2 Progress
- [ ] Day 6: Testing & integration
- [ ] Day 7: Testing & edge cases
- [ ] Day 8: Staging deployment
- [ ] Day 9: Staging testing
- [ ] Day 10: Security review

### Overall Progress
- Critical Issues: 0/5 ✅
- High Priority: 0/5 ✅
- Medium Priority: 0/5 ✅
- Test Coverage: 0% → Target: 80%
- Phases Complete: 0/7

---

## 🎯 Today's Goals

### Today's Focus
- [ ] Issue 1: ________________
- [ ] Issue 2: ________________
- [ ] Issue 3: ________________

### Today's Accomplishments
- [ ] ________________
- [ ] ________________
- [ ] ________________

### Tomorrow's Priorities
- [ ] ________________
- [ ] ________________
- [ ] ________________

---

## 🛠️ Common Tasks

### Run Full Audit
```bash
# Lint
pnpm lint

# Type check
pnpm check

# Tests
pnpm test

# Build
pnpm build
```

### Check Logs
```bash
# Error log
tail -f logs/error.log

# Combined log
tail -f logs/combined.log

# Production logs (if deployed)
kubectl logs -f deployment/verytippers
```

### Database Checks
```bash
# Run migrations
npx prisma migrate dev

# Check database
npx prisma studio

# Backup database
pg_dump verytippers > backup.sql
```

### Redis Checks
```bash
# Connect to Redis
redis-cli

# Check rate limit keys
KEYS rate_limit:*

# Clear rate limits (if needed)
FLUSHDB
```

---

## 🚨 Red Flags (Stop Everything)

If you find any of these, stop and fix immediately:

- [ ] Private key in code or .env
- [ ] No signature verification
- [ ] Nonce can be reused
- [ ] Encryption broken or missing IV
- [ ] No rate limiting
- [ ] SQL injection possible
- [ ] Secrets in logs
- [ ] No error handling in async code
- [ ] Database race conditions
- [ ] Relayer can be front-run

**Reference**: `verytippers_cursor_prompt.md` → Red Lines section

---

## 📝 Quick Reference

### File Locations
- Encryption: `server/services/TipService.ts:107-114`
- Private Keys: `server/config.ts:66`, `server/services/BlockchainService.ts:139`
- Signature Verification: `server/services/BlockchainService.ts:157-177`
- Rate Limiting: `server/index.ts:36`
- Input Validation: `server/services/TipService.ts:55-105`

### Environment Variables
- `SPONSOR_PRIVATE_KEY` → Should use KMS instead
- `ENCRYPTION_SECRET` → Should be strong random secret
- `KMS_KEY_ID` → AWS KMS key ID
- `REDIS_URL` → Redis connection string
- `DATABASE_URL` → PostgreSQL connection string

### Key Commands
```bash
# Start development
pnpm dev

# Start production
pnpm build && pnpm start

# Run tests
pnpm test

# Type check
pnpm check

# Lint
pnpm lint
```

---

## ✅ Daily Checklist Template

Copy this for each day:

### Date: _______________

#### Morning (5 min)
- [ ] Linter check
- [ ] Test run
- [ ] Error log review
- [ ] Security scan

#### Today's Work
- [ ] Issue 1: ________________
- [ ] Issue 2: ________________
- [ ] Issue 3: ________________

#### Evening (5 min)
- [ ] Commit changes
- [ ] Update progress
- [ ] Plan tomorrow

#### Notes
- ________________
- ________________
- ________________

---

## 🎓 Learning Resources

### Quick Links
- [EIP-191 Specification](https://eips.ethereum.org/EIPS/eip-191)
- [EIP-712 Specification](https://eips.ethereum.org/EIPS/eip-712)
- [OpenZeppelin Security](https://blog.openzeppelin.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Prisma Documentation](https://www.prisma.io/docs/)

### Internal Docs
- `EXECUTIVE_SUMMARY.md` - Overview
- `README_HOW_TO_USE.md` - Day-by-day workflow
- `verytippers_cursor_prompt.md` - 7-phase audit
- `verytippers_critical_patterns.md` - 10 bug patterns
- `INDEX.md` - Navigation guide

---

## 🎯 Success Metrics

Track your progress:

- **Critical Issues Fixed**: 0/5
- **High Priority Issues Fixed**: 0/5
- **Test Coverage**: 0% → 80%
- **Phases Complete**: 0/7
- **Days to Production**: ____

---

**Remember**: Small, consistent progress beats perfectionism. Fix one issue at a time, test thoroughly, and you'll get there! 🚀

---

**Created**: December 25, 2025  
**For**: lucylow/verytippers  
**Status**: Daily Use


