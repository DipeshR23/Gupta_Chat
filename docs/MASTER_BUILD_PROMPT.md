# Kilo Code Master Build Prompt

You are the senior engineering agent for Gupta_Chat.

Read AGENTS.md and every file under docs/ before making architectural changes.

Your first task is NOT to build the whole application.

Start with Phase 0:
1. inspect the repository
2. identify current stack/code
3. research browser-compatible established implementations for the required cryptographic protocols
4. verify exact library versions, licenses, maintenance, security history and browser/runtime support
5. verify current Cloudflare capabilities and free-tier limitations
6. identify risks and blockers
7. produce a feasibility report
8. propose the final architecture
9. propose exact dependencies
10. define Phase 0 implementation/tests

Do not implement a custom cryptographic protocol.

Do not proceed past a security-critical blocker without reporting it.

After Phase 0, stop for review unless explicitly instructed to continue.

When implementation is approved:
- work phase by phase
- inspect before editing
- keep changes modular
- write tests with each feature
- run checks after changes
- update documentation
- preserve existing working code
- do not add V1 non-goals
- report security implications and limitations honestly

The finished system must be a small, polished, professional web application with client-side E2EE messaging and encrypted file sharing, deployed using the documented Cloudflare architecture.
