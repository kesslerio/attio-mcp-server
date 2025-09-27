# Company URL Validation Hardening

This note summarises the security fixes applied to the company validator in response to CodeQL alerts (#752).

## Safe protocol enforcement

All company website and LinkedIn URL fields now pass through a shared `ensureSafeUrl` helper. The helper parses the string with the `URL` constructor, rejects invalid URLs, and only allows `http` or `https` schemes. Any attempt to use `javascript:`, `data:`, or other non-web protocols raises an `InvalidCompanyDataError` so unsafe links are blocked early.

## LinkedIn host verification

LinkedIn URLs must resolve to the `linkedin.com` apex domain or one of its legitimate subdomains. The `isLinkedInHostname` guard normalises the hostname to lower case and ensures it either exactly matches `linkedin.com` or ends with `.linkedin.com`. This stops bypasses such as `linkedin.com.attacker.com` while still accepting regional hosts like `fr.linkedin.com`.

## Regression coverage

The enhanced test suite adds coverage for the new guardrails. It rejects LinkedIn URLs with deceptive hostnames, disallows unsafe protocols for both website and LinkedIn fields, and confirms that trusted subdomains still pass validation.
