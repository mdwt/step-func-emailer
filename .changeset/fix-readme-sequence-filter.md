---
"create-mailshot": patch
---

Fix scaffolded README example to use `pnpm --filter <name>` instead of `pnpm --filter @mailshot/<name>` — sequence packages have no namespace, so the old example was misleading and could cause AI-assisted scaffolding to incorrectly prefix sequence package names with `@mailshot/`.
