# Development Checklist

## Before coding
- [ ] Inspect repository
- [ ] Read all docs
- [ ] Verify crypto implementation
- [ ] Verify browser compatibility
- [ ] Verify dependency licenses/maintenance
- [ ] Confirm Cloudflare capabilities and current quotas
- [ ] Define API schemas
- [ ] Define D1 schema
- [ ] Define threat model

## Before each phase
- [ ] Plan affected files
- [ ] Identify security impact
- [ ] Identify tests
- [ ] Identify migration needs

## Before release
- [ ] Typecheck
- [ ] Lint
- [ ] Unit tests
- [ ] Crypto tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Browser matrix
- [ ] Security review
- [ ] Dependency audit
- [ ] Verify no plaintext leaks
- [ ] Verify no private keys reach server
- [ ] Verify R2 contains ciphertext only
- [ ] Verify local-data deletion
- [ ] Verify deployment
- [ ] Update documentation
