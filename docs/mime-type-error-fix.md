# MIME Type Error: CSS Files Being Executed as Scripts

## Problem Description
The error "Refused to execute script from '...css' because its MIME type ('text/css') is not executable" occurs when the browser tries to execute CSS files as JavaScript scripts. This typically happens due to:

1. **Reverse Proxy Configuration Issues**: Nginx, Apache, or cloud load balancers not properly setting MIME types
2. **Custom Server MIME Type Handling**: Conflicts between custom server configurations and hosting environments
3. **Hosting Environment Misconfiguration**: Cloud platforms not properly handling static asset MIME types

## Root Causes

### 1. Reverse Proxy MIME Type Handling
When running behind a reverse proxy (nginx, Apache, cloud load balancer), the proxy might not be setting the correct `Content-Type` headers for static assets.

### 2. Content-Type Header Conflicts
Multiple layers setting different `Content-Type` headers can cause conflicts, especially with the `X-Content-Type-Options: nosniff` header.

### 3. Cloud Platform Configuration
Cloud hosting platforms (AWS, Azure, GCP) often have their own proxy layers that need specific configuration.

## Solutions Applied

### 1. Updated Next.js Configuration (`next.config.js`)
- Added explicit MIME type headers for CSS and JS files
- Implemented Content Security Policy to prevent CSS execution
- Added `X-Content-Type-Options: nosniff` for all static assets

### 2. Enhanced Custom Server (`server.js`)
- Improved MIME type detection and header setting
- Added security headers to prevent CSS execution
- Implemented proper Content-Type handling for all static assets

### 3. Nginx Configuration (`nginx.conf`)
- Created reverse proxy configuration with proper MIME type handling
- Added security headers and caching directives
- Implemented proper proxy_pass configuration

## Immediate Actions Required

### For Development Environment
1. **Restart your development server**:
   ```bash
   npm run dev
   # or
   npm run dev:custom
   ```

2. **Clear browser cache** and hard refresh the page

3. **Check browser console** for any remaining MIME type errors

### For Production/Staging Environment
1. **Rebuild and redeploy** your application:
   ```bash
   npm run build
   npm run start:custom
   ```

2. **If using Docker**, rebuild your container:
   ```bash
   docker-compose down
   docker-compose up --build -d
   ```

3. **If behind a reverse proxy**, apply the `nginx.conf` configuration

## Verification Steps

### 1. Check Network Tab
- Open browser DevTools → Network tab
- Refresh the page
- Look for CSS files in the network requests
- Verify `Content-Type` header shows `text/css; charset=utf-8`

### 2. Check Response Headers
- Click on any CSS file in the Network tab
- Verify these headers are present:
  ```
  Content-Type: text/css; charset=utf-8
  X-Content-Type-Options: nosniff
  Cache-Control: public, max-age=31536000, immutable
  ```

### 3. Check Console for Errors
- Open browser DevTools → Console tab
- Look for any remaining MIME type or script execution errors

## Additional Configuration Options

### For Cloudflare
If using Cloudflare, add these Page Rules:
- **URL Pattern**: `*dev-ncc-cv-screening.qsncc.com/_next/static/css/*`
- **Settings**: 
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 year
  - Browser Cache TTL: 1 year

### For AWS CloudFront
Add custom headers in CloudFront distribution:
- `X-Content-Type-Options`: `nosniff`
- `Content-Security-Policy`: `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';`

### For Azure Application Gateway
Configure custom response headers:
- `X-Content-Type-Options`: `nosniff`
- `Content-Security-Policy`: `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';`

## Troubleshooting Commands

### Check Current Headers
```bash
curl -I "https://dev-ncc-cv-screening.qsncc.com/_next/static/css/640526af89db63cc.css"
```

### Test MIME Type Detection
```bash
curl -H "Accept: text/css" "https://dev-ncc-cv-screening.qsncc.com/_next/static/css/640526af89db63cc.css"
```

### Verify Server Configuration
```bash
# If using custom server
curl -I "http://localhost:8021/_next/static/css/640526af89db63cc.css"
```

## Prevention Measures

### 1. Regular Monitoring
- Set up monitoring for MIME type errors
- Check browser console logs regularly
- Monitor network requests for incorrect Content-Type headers

### 2. Automated Testing
- Add MIME type validation to your CI/CD pipeline
- Test static asset serving in staging environments
- Validate headers in automated browser tests

### 3. Documentation
- Keep this guide updated with any new configurations
- Document hosting environment-specific requirements
- Maintain a checklist for deployment verification

## Common Issues and Solutions

### Issue: CSS still executing as script after applying fixes
**Solution**: Clear all caches (browser, CDN, reverse proxy) and verify the hosting environment configuration

### Issue: Mixed content warnings
**Solution**: Ensure all static assets are served over HTTPS and update any hardcoded HTTP URLs

### Issue: Performance degradation after adding security headers
**Solution**: Monitor performance metrics and adjust caching strategies as needed

## Support and Escalation

If the issue persists after applying all solutions:

1. **Check hosting provider documentation** for MIME type configuration
2. **Contact hosting support** with specific error details and attempted solutions
3. **Review browser compatibility** - some older browsers may have stricter MIME type enforcement
4. **Consider using a CDN** with proper MIME type handling

## References

- [Next.js Static Asset Handling](https://nextjs.org/docs/advanced-features/static-html-export)
- [MDN Content-Type Header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Type)
- [Security Headers Best Practices](https://owasp.org/www-project-secure-headers/)
- [Nginx MIME Type Configuration](https://nginx.org/en/docs/http/ngx_http_core_module.html#types)
