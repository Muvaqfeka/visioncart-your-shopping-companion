# Architecture rules
- Keep authoritative stock in Lovable Cloud and refresh on product visits, focus, polling, and before cart additions; fail closed when checks fail.
- Keep wallet balances and payment approvals server-owned; never credit a wallet from browser storage or a customer payment claim.
- Verify UPI recharges through the payment provider before an atomic, idempotent wallet credit.
- Use account password reauthentication as the secure payment fallback until enrolled, server-verified WebAuthn credentials are available; never simulate biometric success.
- Keep the existing voice/blink navigation and manual fallback controls available during storefront design changes.