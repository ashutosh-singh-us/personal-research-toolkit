---
name: Avoid npm install during axios supply chain incident
description: User wants to avoid all npm installations until the axios RAT supply chain attack (March 2026) is fully resolved
type: feedback
---

Do not run `npm install`, `npm ci`, `yarn install`, `pnpm install`, or any package installation commands unless absolutely no other option exists and the user explicitly approves.

**Why:** The axios npm supply chain attack (March 30, 2026) compromised axios@1.14.1 and axios@0.30.4 via a hijacked maintainer account, deploying a cross-platform RAT through a malicious postinstall script. Trust in the npm registry is currently degraded.

**How to apply:** When a task would normally require installing npm packages, find alternatives first (use existing node_modules, vendor manually, or skip the dependency). If installation is truly unavoidable, flag it to the user and get explicit approval before proceeding.
