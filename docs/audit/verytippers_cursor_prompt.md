# VeryTippers Comprehensive Code Audit & Fix Prompt

## 🎯 Mission Statement

You are conducting a professional code audit and refactoring of the VeryTippers gasless micro-tipping system. The system is a sophisticated Web3 application that handles:

- Real cryptocurrency transactions (gas-sponsored via relayer)
- Encrypted message storage (IPFS with AES-256-GCM)
- Cryptographic signatures (Ethereum-standard meta-transactions)
- Distributed state synchronization (blockchain indexer + UI updates)
- Rate limiting & abuse prevention (Redis-based policies)

This is not a hackathon demo anymore. It's going to production. Every bug is a direct financial risk to users. Your job is to find and fix them all.

## 🚨 Context: Why This Matters

VeryTippers lets users send cryptocurrency tips directly from chat. If something breaks:

- User funds get stuck (tips not submitted)
- User funds are lost (tips double-submitted due to nonce reuse)
- User privacy violated (messages exposed in plaintext)
- System is abused (no rate limiting = unlimited free transactions)
- Replay attacks (attacker replays old signatures)

This audit prevents all of the above.

## 📚 Supporting Documents

You have access to three detailed guides:

1. **verytippers_cursor_prompt.md** - 7 phases of systematic audit
2. **verytippers_critical_patterns.md** - 10 code patterns that are most likely to have bugs
3. **verytippers_daily_checklist.md** - Daily workflow and quick reference

Use them in this order:

1. **First**: Skim all three documents to understand what you're looking for
2. **Second**: Work through the critical patterns
3. **Third**: Complete each phase systematically
4. **Fourth**: Use the daily checklist to verify completion

## 🚀 How to Use This Prompt

### Step 1: Initial Setup

```bash
cd /path/to/verytippers
cursor .
```

### Step 2: Create a New Chat in Cursor

Open Cursor's AI chat (Cmd+L on Mac, Ctrl+L on Linux/Windows) and paste this:

```
I'm auditing the VeryTippers gasless micro-tipping system for production readiness.

The system has:
- React + Vite frontend (chat-first UX)
- Node.js backend (Orchestrator, Relayer, Indexer)
- Solidity smart contracts (TipRouter)
- IPFS encryption (AES-256-GCM)
- Redis queues and rate limiting
- Postgres ledger with audit logs
- KMS-based relayer signing

I have three detailed audit guides:
1. verytippers_cursor_prompt.md - systematic 7-phase audit
2. verytippers_critical_patterns.md - 10 most-likely bugs with fixes
3. verytippers_daily_checklist.md - daily workflow

Let's start by identifying the most critical issues. I'll show you files, you analyze them.
```

### Step 3: Work Through Phases

For each phase, create a new message:

```
**PHASE 1: STRUCTURAL AUDIT**

Let's validate the repository structure. I'll show you key files, you check against the criteria.

First, show me:
1. Root package.json - are all workspaces defined?
2. Root tsconfig.json - is strict mode enabled?
3. .env.example - are all required vars documented?
4. docker-compose.yml - are all services properly configured?

Then report issues found.
```

### Step 4: Fix Issues One by One

For each issue Cursor finds, ask it to fix:

```
I found a critical issue in [file]:

**Problem**: [Describe issue from the code]

**Expected Behavior**: [What should happen instead]

**Fix**: [How to fix it]

Please generate the corrected code. Keep all error handling and logging.
```

### Step 5: Verify Fix

```
Generate a unit test that verifies this fix works correctly.
Include both happy path and failure cases.
```

## 🎯 Key Success Criteria

Before declaring "production ready":

### ✅ Security
- No private keys in code, .env, or logs
- All inputs validated with schema (Zod/Joi)
- All signatures verified with ecrecover
- All rate limits enforced in Redis
- Encryption uses AES-256-GCM with random IV
- No XSS vulnerabilities (inputs escaped)
- No SQL injection (parameterized queries only)
- HTTPS enforced (no plaintext credentials)

### ✅ Reliability
- All async operations have error handling
- Database updates are atomic (transactions)
- Nonce tracking prevents replay attacks
- Reorg handling implemented (blockchain resets)
- Circuit breakers for external services
- Retry logic with exponential backoff
- No race conditions in state updates
- Health checks on all endpoints

### ✅ Performance
- Database queries optimized (< 100ms typical)
- No N+1 query problems
- Leaderboard cached in Redis
- Frontend bundle < 500KB gzipped
- Images lazy-loaded
- TypeScript strict mode enabled
- No memory leaks in subscriptions

### ✅ Operations
- Monitoring set up (Prometheus metrics)
- Logging structured (JSON format)
- Secrets managed via KMS/Vault
- Deployment documented
- Incident playbook created
- Backups configured
- Recovery process tested

### ✅ Code Quality
- Test coverage > 80%
- No `any` types
- Linting passes
- All errors caught and logged
- No console.log in production code
- Comments on complex logic
- Dead code removed

## 🔴 Red Lines (Stop Everything)

If you find **ANY** of these, stop immediately and fix before continuing:

- Private key in code or .env file
- No signature verification on meta-transactions
- Nonce not tracked or can be reused
- IPFS encryption missing IV or broken
- No rate limiting on API endpoints
- SQL injection possible (string interpolation in queries)
- Secrets logged or exposed in error messages
- No error handling in async/await code
- Database race conditions (find then update)
- Relayer can be front-run or duplicated

## 📊 Audit Phases (Order Matters)

### Phase 1: Structural (1-2 hours)
- Repository layout correct
- Dependencies pinned
- Environment configured
- Docker builds without errors
- TypeScript compiles

### Phase 2: Frontend (2-3 hours)
- Type safety (no `any`)
- React best practices (useEffect deps, etc.)
- Wallet integration (no key storage)
- IPFS encryption (IV, GCM, decryption)
- Error handling (try-catch, user-friendly messages)

### Phase 3: Backend (3-4 hours)
- Input validation (schema, not just type)
- Orchestrator (encrypt, IPFS, queue)
- Relayer (KMS signing, nonce, retry)
- Indexer (events, reorg handling, DB atomicity)
- Rate limiting (Redis, per-user, time windows)
- Error handling (structured logs, no leaks)

### Phase 4: Smart Contracts (1-2 hours)
- Signature verification (EIP-191)
- Nonce replay protection
- Event emission
- No integer overflow
- No re-entrancy

### Phase 5: Infrastructure (1-2 hours)
- Dockerfile security
- Docker-compose service health
- Kubernetes manifests (if applicable)
- Secrets management
- Resource limits

### Phase 6: Testing (2-3 hours)
- Unit tests for critical functions
- Integration tests for flows
- E2E tests (if possible)
- Coverage > 80%

### Phase 7: Deployment (1 hour)
- Staging tested
- Production checklist
- Monitoring configured
- Backups working
- Incident response plan

## 💡 Pro Tips for Using Cursor

### Tip 1: Ask Cursor to Find Patterns

```
Search the codebase for [pattern] and show me:
1. File paths where found
2. The exact code
3. Whether it's a problem
4. How to fix it
```

### Tip 2: Ask Cursor to Read Files

```
Show me the entire contents of [file].
Then analyze it for security issues.
```

### Tip 3: Ask Cursor to Generate Tests

```
Write Jest unit tests for [function] covering:
- Happy path
- Error cases
- Edge cases

Use realistic test data.
```

### Tip 4: Ask Cursor to Trace Logic

```
Trace through the flow when user creates a tip:
1. Frontend calls /api/tip
2. Backend validates and encrypts
3. Orchestrator adds to IPFS
4. Relayer submits transaction
5. Indexer processes event

At each step, show what could break.
```

### Tip 5: Ask Cursor to Generate Fixes

```
Generate a corrected version of [function] that:
1. [Fix 1]
2. [Fix 2]
3. [Fix 3]

Keep all existing error handling.
Use best practices from [reference].
```

## 🏗️ Architecture to Keep in Mind

```
USER
  ↓
[Frontend] (React + Vite)
  - Compose tip message
  - Sign meta-payload (Wepin wallet)
  - Encrypt message
  ↓
[API Gateway]
  - CORS check
  - Rate limit middleware
  ↓
[Orchestrator] (Node.js)
  - Validate signature
  - Check policies (no self-tip, cap limits)
  - Encrypt message (if not client-side)
  - IPFS add → CID
  - Queue meta-transaction
  - Persist to DB
  ↓
[Redis Queue]
  ↓
[Relayer] (Node.js)
  - Dequeue meta-transactions
  - Check policies again
  - Sign with KMS
  - Submit to chain (RPC)
  - Record tx hash
  ↓
[VERY Chain]
  - TipRouter contract
  - Verify relayer signature
  - Check nonce (no replay)
  - Emit TipSubmitted event
  ↓
[Indexer] (Node.js)
  - Listen to TipSubmitted events
  - Fetch encrypted message from IPFS
  - Decrypt
  - Update DB (atomic)
  - Update leaderboard cache (Redis)
  - Send WebSocket notification
  ↓
[Frontend UI]
  - Tip confirmed ✓
  - Show message
  - Update leaderboard
```

Every step is a potential failure point. Your job is to find and fix them.

## 📞 When Stuck

If Cursor can't help or you're unsure about something:

- **Encryption**: Reference `libsodium` or OpenZeppelin's encryption code
- **Signatures**: Reference `EIP-191` and `ethers.js` examples
- **Smart Contracts**: Reference OpenZeppelin and Trail of Bits
- **KMS**: Check AWS KMS, Google Cloud KMS, or Vault
- **Database**: Reference MongoDB or Postgres transaction docs

## 🎓 Learning Resources

While auditing, familiarize yourself with:

- **Ethereum Signing**: [Web3.py docs](https://web3py.readthedocs.io/), [ethers.js](https://docs.ethers.org/)
- **IPFS**: [js-ipfs docs](https://js.ipfs.tech/), [kubo docs](https://docs.ipfs.tech/)
- **Web3 Security**: [OpenZeppelin blog](https://blog.openzeppelin.com/), [SigmaPrime reports](https://sigp.io/)
- **React Best Practices**: [React docs](https://react.dev/), [Kent C. Dodds](https://kentcdodds.com/)
- **TypeScript**: [TypeScript handbook](https://www.typescriptlang.org/docs/), strict mode guide

## ✅ Completion Checklist

When you're done with the full audit:

- [ ] All critical issues fixed
- [ ] All high-priority issues fixed
- [ ] Phase 1 (Structural) complete
- [ ] Phase 2 (Frontend) complete
- [ ] Phase 3 (Backend) complete
- [ ] Phase 4 (Smart Contracts) complete
- [ ] Phase 5 (Infrastructure) complete
- [ ] Phase 6 (Testing) complete
- [ ] Phase 7 (Deployment) complete
- [ ] Test coverage > 80%
- [ ] No secrets in code/logs
- [ ] Linting passes
- [ ] All tests pass
- [ ] Documentation updated
- [ ] Incident playbook created
- [ ] Staging deployment tested
- [ ] Security audit approval

## 🚀 After This Audit

Once you complete this comprehensive audit:

1. **Deploy to Staging** - Run through entire flow in staging environment
2. **Security Review** - Have an external team review critical sections
3. **Load Testing** - Ensure system handles expected load
4. **User Acceptance Testing** - Have actual users try it
5. **Production Deployment** - Gradual rollout (10%, 50%, 100%)
6. **Monitor Closely** - First week = real-time alerts and on-call team
7. **Iterate** - Use real user feedback to improve

## 📌 Remember

- Every line of code is a liability until proven safe
- Assume every user is an attacker (they're not, but code should be secure anyway)
- Test the unhappy path (failures, timeouts, malformed input)
- Log for debugging (not for invading privacy)
- Document for the next person (might be you in 6 months)
- Deploy with confidence (you've tested everything)

## 🎯 Final Success Criteria

You'll know you're done when:

- ✅ You can explain every decision in the codebase
- ✅ You've tested every error case
- ✅ You've verified every signature
- ✅ You've secured every key
- ✅ You've optimized every query
- ✅ You've documented every pattern
- ✅ You've automated every check
- ✅ You've rehearsed every failure

Good luck. The stakes are real. 🚀

---

**Created**: December 25, 2025  
**For**: lucylow/verytippers  
**Status**: Ready for Production Audit  
**Confidence Level**: Professional-Grade


