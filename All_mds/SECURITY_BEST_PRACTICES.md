# 🛡️ Security Best Practices for Prepwise Developers

## Quick Reference

### When Adding New API Endpoints

```javascript
// ✅ DO THIS:
import { getCurrentUser } from "@/lib/actions/auth.action";
import { checkSomeRateLimit } from "@/lib/security/rate-limiters";
import { sanitizeString, verifyUserOwnership } from "@/lib/security/endpoint-security";

export async function POST(request) {
  // 1. Always verify authentication first
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  // 2. Get & validate user ID
  const { userId } = await request.json();
  if (userId !== currentUser.uid) {
    return Response.json({ error: "ID mismatch" }, { status: 403 });
  }

  // 3. Check rate limits
  if (!checkSomeRateLimit(userId)) {
    return Response.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  // 4. Validate and sanitize inputs
  const data = sanitizeString(userInput);

  // 5. Perform action
  // ...

  return Response.json({ success: true });
}
```

### When Creating New Collections in Firestore

```javascript
// ✅ Good Firestore Rules Template
match /my_collection/{documentId} {
  // Creator can read their own documents
  allow read: if request.auth != null && 
    resource.data.createdBy == request.auth.uid;
  
  // Only authenticated users can create
  allow create: if request.auth != null &&
    request.resource.data.createdBy == request.auth.uid;
  
  // Only creator can update
  allow update: if request.auth != null &&
    resource.data.createdBy == request.auth.uid;
  
  // Only creator can delete
  allow delete: if request.auth != null &&
    resource.data.createdBy == request.auth.uid;
}
```

---

## Security Checklists

### Before Committing Code

- [ ] No `console.log()` with sensitive data (user IDs, tokens, etc.)
- [ ] All API endpoints have authentication check
- [ ] User ID from request matches `currentUser.uid`
- [ ] All string inputs are sanitized with `sanitizeString()`
- [ ] Numeric inputs are validated (min/max ranges)
- [ ] Status fields are validated against allowed values
- [ ] URLs are validated with `isValidUrl()`
- [ ] Rate limits applied where appropriate
- [ ] No hardcoded API keys or secrets
- [ ] Error messages don't expose system internals

### Before Deploying to Production

- [ ] DEBUG_ENDPOINTS_ENABLED=false in .env
- [ ] NODE_ENV=production in .env
- [ ] Firestore rules deployed with latest version
- [ ] All new collections have explicit Firestore rules
- [ ] No debug code left in production
- [ ] Rate limiter uses Redis (not memory) for multi-instance
- [ ] Error messages are user-friendly (no stack traces)
- [ ] Sensitive data fields are encrypted if needed
- [ ] API keys are rotated
- [ ] Monitoring/logging is configured

---

## Common Vulnerability Patterns (AVOID)

### ❌ WRONG: Trust user-submitted ID

```javascript
export async function POST(request) {
  const { userId } = await request.json();
  
  // ❌ WRONG: No verification
  await db.collection("users").doc(userId).update({...});
}
```

### ✅ RIGHT: Verify user is owner

```javascript
export async function POST(request) {
  const currentUser = await getCurrentUser();
  const { userId } = await request.json();
  
  // ✅ Verify they match
  if (userId !== currentUser.uid) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }
  
  await db.collection("users").doc(userId).update({...});
}
```

---

### ❌ WRONG: String concatenation in prompts

```javascript
const prompt = `Generate questions for ${role} in ${techstack}.`;
// ❌ WRONG: User can inject prompts
```

### ✅ RIGHT: Use templates with sanitized inputs

```javascript
const sanitizedRole = sanitizeString(role);
const sanitizedTech = sanitizeString(techstack);

const prompt = `Generate questions for ${sanitizedRole} in ${sanitizedTech}.`;
// ✅ Inputs are escaped and limited
```

---

### ❌ WRONG: No rate limiting

```javascript
export async function POST(request) {
  // ❌ WRONG: Can be called unlimited times
  const result = await expensiveApiCall();
  return Response.json(result);
}
```

### ✅ RIGHT: Apply rate limits

```javascript
export async function POST(request) {
  const currentUser = await getCurrentUser();
  
  // ✅ Check rate limit
  if (!checkExpensiveActionRateLimit(currentUser.uid)) {
    return Response.json({ error: "Rate limited" }, { status: 429 });
  }
  
  const result = await expensiveApiCall();
  return Response.json(result);
}
```

---

## Environment Variables

### ✅ REQUIRED in .env.local

```bash
# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-email@iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="your-private-key"

# Google AI API
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:4001
NODE_ENV=development
```

### ✅ OPTIONAL (recommended)

```bash
# Security
DEBUG_ENDPOINTS_ENABLED=false
RATE_LIMIT_STORE=memory  # Use "redis" in production

# Monitoring
LOG_LEVEL=info
SENTRY_DSN=your-sentry-dsn
```

### ❌ NEVER commit

- API keys
- Private keys
- Session tokens
- Database credentials
- Secrets of any kind

---

## Testing Security

### Test Rate Limiting

```bash
# Make 21 requests in 5 minutes to session join
for i in {1..21}; do
  curl -X POST http://localhost:4001/api/interview-buddy/join-session \
    -H "Content-Type: application/json" \
    -d '{"userId":"test","sessionCode":"IB-ABC123"}'
  sleep 1
done
# Should get 429 on request 21+
```

### Test Authentication

```bash
# Try without session cookie
curl -X GET http://localhost:4001/api/protected-endpoint
# Should get 401

# Try with forged user ID
curl -X POST http://localhost:4001/api/create-session \
  -H "Content-Type: application/json" \
  -d '{"userId":"someone-elses-id"}'
# Should get 403
```

### Test Input Validation

```bash
# Try prompt injection
curl -X POST http://localhost:4001/api/vapi/generate \
  -H "Content-Type: application/json" \
  -d '{
    "role": "Software Engineer\"; DROP TABLE users; //",
    "level": "senior",
    "techstack": "javascript",
    "type": "technical",
    "amount": "5",
    "userid": "user-id"
  }'
# Should sanitize or reject malicious input
```

---

## Monitoring & Alerting

### Metrics to Watch

- [ ] API response times
- [ ] Rate limit hits (429 errors)
- [ ] Authentication failures (401/403 errors)
- [ ] Gemini API quota usage
- [ ] Firestore read/write costs
- [ ] Session creation/join patterns
- [ ] Error rate by endpoint

### Alerting Thresholds

- [ ] >100 rate limit hits in 5 minutes
- [ ] >10 auth failures from single IP in 5 minutes
- [ ] 429 error rate >5% on any endpoint
- [ ] Unexpected spike in API calls

---

## Incident Response

If you suspect a security breach:

1. **STOP**: Don't make changes
2. **REPORT**: Notify team lead immediately
3. **ISOLATE**: Disable affected endpoints if needed
4. **ANALYZE**: Review logs for unauthorized access
5. **FIX**: Apply security patch
6. **TEST**: Verify fix works
7. **DEPLOY**: Deploy to production
8. **MONITOR**: Watch for similar attacks

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Firebase Security Best Practices](https://firebase.google.com/docs/security)
- [Node.js Security Checklist](https://nodejs.org/en/docs/guides/security/)
- [Next.js Security](https://nextjs.org/docs/security)
- [Prompt Injection Attacks](https://owasp.org/www-project-web-security-testing-guide/)

---

**Questions?** Ask the security team or check the security-fixes-summary.md file.
