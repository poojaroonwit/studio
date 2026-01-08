# Security Documentation - FitScan Enterprise ATS

**Project Name:** FitScan Enterprise  
**Document Version:** 1.0  
**Date:** December 16, 2025  
**Status:** Active Development

---

## 1. Authentication & Authorization

### 1.1 Password Security

- **Password Hashing**: bcrypt with salt rounds (configurable)
- **Session Management**: Secure NextAuth.js sessions with JWT
- **Force Password Change**: Require password changes on first login
- **Account Lockout**: Inactive account management

### 1.2 Multi-Provider Authentication

- **Email/Password**: Traditional login with bcrypt hashing
- **Azure AD SSO**: Enterprise single sign-on
- **Session Refresh**: Automatic session refresh and validation

---

## 2. Data Protection

### 2.1 Input Validation

- **Schema Validation**: Zod schema validation on all inputs
- **SQL Injection Prevention**: Parameterized queries via Prisma ORM
- **XSS Protection**: Content Security Policy headers and sanitization

### 2.2 File Security

- **Type Validation**: Strict file type checking
- **Size Limits**: Configurable upload size limits
- **Secure Access**: MinIO with signed URLs for file access
- **Virus Scanning**: Optional virus scanning integration

### 2.3 Data Encryption

- **At Rest**: Database encryption for sensitive data
- **In Transit**: TLS 1.2+ for all communications
- **Secrets**: Environment variable storage for sensitive configuration

---

## 3. Access Control

### 3.1 Role-Based Access Control (RBAC)

| Role | Description | Access Level |
|------|-------------|--------------|
| **Super Admin** | Full system access | All modules and settings |
| **Admin** | Administrative access | User management, system settings |
| **Recruiter** | Recruitment operations | Candidates, positions (Read/Write) |
| **Hiring Manager** | Decision making | Assigned positions, candidates (Read) |
| **Interviewer** | Evaluation only | Assigned evaluation sessions |

### 3.2 Granular Permissions

Permissions are organized by module:
- `VIEW` - Read access to module data
- `MANAGE` - Create, update, delete operations
- `EXPORT` - Export data to CSV/Excel
- `IMPORT` - Import data from external sources
- `ADMIN` - Administrative functions

### 3.3 Permission Hierarchy

1. **User Groups**: Define base permissions
2. **User Assignment**: Users inherit group permissions
3. **Individual Overrides**: User-specific permission customization

### 3.4 API Authentication

- **Session-based**: Web application authentication
- **JWT Tokens**: V1 API authentication
- **API Keys**: External service integration

---

## 4. Security Monitoring

### 4.1 Audit Logging

All critical operations are logged:
- User authentication events
- Data modifications (create, update, delete)
- Permission changes
- System configuration changes

### 4.2 Security Dashboard

- Monitor security alerts
- Track access patterns
- Identify suspicious activity
- Review authentication failures

### 4.3 Session Monitoring

- Track active user sessions
- Monitor concurrent logins
- Detect session anomalies
- Force session termination

### 4.4 Content Protection Features

**Screen Capture Protection** (configurable via System Settings):
- Blurs page content when browser tab loses focus
- Blocks PrintScreen key capture
- Blocks Windows Snipping Tool shortcut (Win+Shift+S)
- Prevents screen recording of sensitive data

**Right-Click Protection** (configurable via System Settings):
- Disables browser context menu across the application
- Prevents "Save Image As" and "Inspect Element" access
- Configurable per deployment via System Settings UI

> **Configuration**: Navigate to Settings → System Settings → Security to enable/disable these features.

---

## 5. Best Practices Implementation

### 5.1 Environment Variables

All sensitive configuration stored in environment variables:
- Database credentials
- API keys
- Authentication secrets
- External service tokens

### 5.2 Secrets Management

- Secure storage of application secrets
- Regular rotation of credentials
- Separation of development/production secrets

### 5.3 HTTPS Enforcement

- SSL/TLS for production deployments
- Certificate management
- HSTS headers

### 5.4 CORS Configuration

- Whitelist allowed origins
- Restrict HTTP methods
- Control credential sharing

### 5.5 Rate Limiting

- API endpoint rate limiting
- Brute force protection
- DDoS mitigation

### 5.6 Security Headers

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: ...
Strict-Transport-Security: ...
```

---

## 6. Compliance

### 6.1 Data Retention

- Soft-delete implementation for auditability
- Configurable retention periods
- Data purge procedures

### 6.2 Privacy Considerations

- PII data handling guidelines
- Data minimization practices
- User consent management

### 6.3 Audit Trail

- Complete activity logging
- Immutable audit records
- Log retention policies

---

## 7. Incident Response

### 7.1 Detection

- Monitor security alerts
- Review audit logs
- Track anomalous behavior

### 7.2 Response Procedures

1. Identify the security incident
2. Contain the threat
3. Investigate root cause
4. Remediate vulnerabilities
5. Document and learn

### 7.3 Recovery

- Backup restoration procedures
- System integrity verification
- Security patch application

---

## 8. Security Checklist

### 8.1 Deployment

- [ ] Change default admin password
- [ ] Configure HTTPS/SSL
- [ ] Set secure NEXTAUTH_SECRET
- [ ] Configure CORS properly
- [ ] Enable audit logging
- [ ] Review file permissions

### 8.2 Regular Maintenance

- [ ] Review audit logs weekly
- [ ] Update dependencies monthly
- [ ] Rotate secrets quarterly
- [ ] Security assessment annually

---

## 9. Related Documentation

- [Installation Guide](./INSTALLATION.md) - Secure deployment
- [CLI Reference](./CLI_REFERENCE.md) - CLI security considerations
- [Backup & Recovery](./BACKUP_RECOVERY.md) - Data protection
