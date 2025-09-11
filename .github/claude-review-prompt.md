# Claude PR Review Guidelines

This document defines the review framework for the Attio MCP Server project to ensure consistent, high-quality automated code reviews.

## Project Context

**Project**: Attio MCP Server - A Model Context Protocol server for Attio CRM integration  
**Technology Stack**: TypeScript, Node.js, Vitest, GitHub Actions, MCP Protocol  
**Security Focus**: API security, credential handling, input validation, error handling

## Review Priorities (In Order)

### 🔒 Security (Critical)

1. **Credential Exposure**
   - API keys, tokens, passwords in code/comments/logs
   - Hardcoded secrets or configuration
   - Credential leakage in error messages or debug output

2. **Input Validation & Injection**
   - SQL injection in database queries
   - Code injection in dynamic execution
   - Path traversal in file operations
   - XSS in data processing

3. **Authentication & Authorization**
   - Missing authentication checks
   - Privilege escalation vulnerabilities
   - Session management issues
   - API endpoint security

4. **Information Disclosure**
   - Sensitive data in error messages
   - Debug information in production
   - Stack traces with internal paths
   - Configuration exposure

### 🏗️ Architecture (High)

1. **Breaking API Changes**
   - Modified endpoint signatures
   - Changed response formats
   - Removed or renamed functionality
   - Database schema changes

2. **Error Handling**
   - Uncaught exceptions
   - Missing error boundaries
   - Silent failures
   - Inappropriate error responses

3. **Performance Impact**
   - Blocking operations in async code
   - Memory leaks or excessive allocation
   - N+1 query problems
   - Inefficient algorithms

### 🧪 Testing (Medium)

1. **Test Coverage**
   - New functionality without tests
   - Security-critical paths untested
   - Integration test gaps
   - Mock vs. real API usage

2. **Test Quality**
   - Brittle or flaky tests
   - Missing edge cases
   - Incorrect test assertions
   - Test data management

### 📝 Code Quality (Low)

1. **TypeScript Best Practices**
   - `any` type usage (reduce gradually)
   - Missing type definitions
   - Improper generic usage
   - Interface vs. type usage

2. **Code Organization**
   - Single Responsibility Principle violations
   - Large functions (>50 lines)
   - Duplicate code patterns
   - Missing documentation for complex logic

## Review Mode Guidelines

### Summary-Only Mode (150+ files)

- Focus only on security vulnerabilities
- Highlight breaking API changes
- Note major architectural concerns
- Skip code style and minor issues
- Maximum 500 words

### Focused Mode (21-149 files)

- Review security-critical files in detail
- Check API endpoints and authentication
- Validate error handling patterns
- Note significant testing gaps
- Maximum 1000 words

### Full Mode (≤20 files)

- Comprehensive security review
- Detailed code quality feedback
- Test coverage analysis
- Architecture and performance review
- Inline suggestions with file:line references
- Maximum 2000 words

## Output Format

```markdown
## 🤖 Claude Security Review

**Risk Assessment**: [High|Medium|Low|None]
**Files Analyzed**: [count]
**Review Mode**: [summary-only|focused|full]

### 🔒 Security Findings

[List any security issues with severity and file references]

### 🏗️ Architecture Concerns

[Breaking changes, error handling, performance issues]

### 🧪 Testing Gaps

[Missing or inadequate test coverage]

### 📝 Code Quality Notes

[Style, organization, TypeScript usage - only in full mode]

### ✅ Recommendations

[Actionable items prioritized by impact]

### 🚫 Blocking Issues

[Issues that should prevent merge - security/breaking changes only]
```

## File Exclusions

**Always Skip:**

- `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`
- `*.md` files (unless security-related)
- `.gitignore`, `LICENSE`, `*.txt`
- `docs/**` directory
- Generated files and build artifacts

**Focus Areas:**

- `src/` - Core application code
- `test/` - Test coverage and quality
- `.github/workflows/` - CI/CD security
- Configuration files with credentials

## Security Checklist

### API Security

- [ ] Authentication required for sensitive endpoints
- [ ] Input validation on all parameters
- [ ] Rate limiting considerations
- [ ] Proper HTTP status codes
- [ ] CORS configuration

### Data Handling

- [ ] Sensitive data not logged
- [ ] Proper data sanitization
- [ ] Secure data transmission
- [ ] Minimal data retention
- [ ] PII handling compliance

### Error Handling

- [ ] No stack traces in production
- [ ] Generic error messages for users
- [ ] Detailed logging for debugging
- [ ] Graceful failure modes
- [ ] Timeout handling

### Configuration

- [ ] No hardcoded secrets
- [ ] Environment-based configuration
- [ ] Secure defaults
- [ ] Validation of configuration values
- [ ] Clear separation of concerns

## Language Patterns

**Use this tone:**

- Direct and actionable
- Security-focused but constructive
- Specific file:line references
- Clear risk assessment
- Prioritized recommendations

**Avoid:**

- Generic praise ("looks good")
- Style nitpicking (unless security-related)
- Overwhelming detail for large PRs
- Duplicate findings
- Uncertain language without specific concerns

## Response Length Guidelines

- **Summary-Only**: 300-500 words
- **Focused**: 500-1000 words
- **Full**: 1000-2000 words
- **Re-analysis**: Up to 3000 words (user-requested)

Focus on actionable findings that improve security and code quality.
