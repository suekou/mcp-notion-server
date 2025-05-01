# Security Policy

## Reporting a Vulnerability

If you discover a security issue, please contact the project maintainers directly. We take security issues seriously and will respond promptly.

## Recent Security Updates

### May 2025 - CVE-2025-24964 in Vitest

**Issue**: The project was using Vitest version 3.0.9, which contained a critical remote code execution vulnerability (CVE-2025-24964). This vulnerability could allow attackers to execute arbitrary code through Cross-site WebSocket hijacking (CSWSH) attacks.

**Fix**: Updated Vitest to version 3.2.10 or later, which contains the security patch for this vulnerability.

**Recommendation**: All users should update to the latest version of this package to receive the security fix.

## Additional Security Recommendations

1. **Keep Dependencies Updated**: Regularly update all dependencies to their latest versions to ensure you have all security patches.

2. **Token Security**: Store your Notion API token securely. Never commit tokens to your repository or share them in unsecured environments.

3. **Restricted Permissions**: When setting up your Notion integration, grant only the permissions required for your specific use case. This follows the principle of least privilege.

4. **Regular Audits**: Periodically audit your usage and permissions to ensure they remain appropriate for your needs.
