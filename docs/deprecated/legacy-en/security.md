# Security

## Principles

1. **Secure by Default** - No access without authentication
2. **Defense in Depth** - Multiple security layers
3. **Least Privilege** - Minimal necessary access
4. **No Secrets in Code** - All secrets in environment

## Threat Model

### Assets

- Notes content (intellectual property)
- Owner credentials
- Zone access codes
- Session tokens

### Threats

| Threat | Mitigation |
|--------|------------|
| Unauthorized access | Access Gate, JWT auth |
| Credential theft | Password hashing, HTTPS |
| Session hijacking | HttpOnly cookies, short TTL |
| Token replay | Expiration, refresh rotation |
| XSS | CSP, input sanitization |
| CSRF | SameSite cookies |

## Authentication

### Password Storage

```javascript
// NEVER store plaintext
// SHA-256 hash with secret salt
const hash = await sha256(password + JWT_SECRET);
await KV.put('owner:password_hash', hash);
```

### JWT Structure

```javascript
// Header
{
  "alg": "HS256",
  "typ": "JWT"
}

// Payload
{
  "sub": "owner",        // or "zone:zone_id"
  "iat": 1705312800,     // Issued at
  "exp": 1705399200,     // Expiration (24h)
  "scope": "full"        // or "zone:zone_id"
}

// Signature
HMAC-SHA256(header + payload, JWT_SECRET)
```

### Token Lifecycle

```
Login → Issue token (24h TTL)
       │
       ├── Use token → Validate signature + expiry
       │
       ├── Refresh → Issue new token, invalidate old
       │
       └── Logout → Clear cookie, blacklist token
```

## CORS Policy

```javascript
// Allowed
'Access-Control-Allow-Origin': 'https://garden.exodus.pp.ua'
'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
'Access-Control-Allow-Headers': 'Content-Type, Authorization'

// Credentials
'Access-Control-Allow-Credentials': 'true'
```

## Headers

```javascript
// Security headers
'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
'X-Content-Type-Options': 'nosniff'
'X-Frame-Options': 'DENY'
'Content-Security-Policy': "default-src 'self'"
```

## Rate Limiting

```javascript
// Per endpoint limits (TODO)
'/auth/login': 5 requests / minute
'/zones/create': 10 requests / minute
'/mcp': 100 requests / minute
```

## Secrets Management

### Required Secrets

| Secret | Purpose | Rotation |
|--------|---------|----------|
| `JWT_SECRET` | Token signing | Quarterly |
| `MINIO_ACCESS_KEY` | S3 access | Quarterly |
| `MINIO_SECRET_KEY` | S3 auth | Quarterly |

### Storage

- **Cloudflare:** Environment Variables (encrypted)
- **Never:** Git, logs, client code

### Rotation Procedure

1. Generate new secret
2. Deploy with new secret
3. Invalidate old sessions
4. Update documentation

## Audit Log (TODO)

```javascript
// Log security events
{
  "event": "auth.login",
  "success": true,
  "ip": "1.2.3.4",
  "timestamp": "2024-01-15T12:00:00Z"
}

{
  "event": "zone.create",
  "zoneId": "zone_abc",
  "owner": "owner",
  "timestamp": "2024-01-15T12:00:00Z"
}
```

## Incident Response

### Compromised Secret

1. Rotate secret immediately
2. Invalidate all sessions
3. Review access logs
4. Notify affected users

### Unauthorized Access

1. Block source IP
2. Invalidate tokens
3. Review and patch vulnerability
4. Document incident
