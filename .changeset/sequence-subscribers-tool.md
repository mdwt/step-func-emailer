---
"@mailshot/handlers": minor
"@mailshot/shared": minor
"@mailshot/mcp": minor
"create-mailshot": minor
---

Add `list_sequence_subscribers` MCP tool to show subscribers currently active in a sequence. `putExecution` now writes an inverted sequence-side row (`PK = EXEC#<sequenceId>, SK = SUB#<email>`) atomically via `TransactWriteItems` (following the existing TagItem pattern); `deleteExecution` cleans up both rows. `list_sequences` now includes `activeExecutionCount` per sequence. New `/inspect-sequence` bootstrap skill bundles active subscribers, recent engagement, and recent failures into one read-only inspection workflow.

**Upgrading existing bootstrapped projects:**

1. **MCP tools** — `list_sequence_subscribers` and the enriched `list_sequences` are available the next time `npx @mailshot/mcp` spawns. Just restart Claude Code.
2. **Dual-row writes** — The new MCP tool returns empty until you redeploy, because the inverted EXEC rows are produced by the handler code that ships in this version. Bump deps and redeploy:
   ```bash
   pnpm up @mailshot/handlers @mailshot/cdk @mailshot/shared
   pnpm install
   /deploy
   ```
3. **`/inspect-sequence` skill** — Skills are scaffolded once at `npx create-mailshot` time and don't auto-update. To add it to an existing project, copy the file from the [v1.7.0 template](https://github.com/mdwt/mailshot/tree/main/packages/create/template/_claude/skills/inspect-sequence) into `.claude/skills/inspect-sequence/SKILL.md`.
4. **In-flight executions** — EXEC items written before the redeploy only have the subscriber-side row and won't appear in the inspector until they complete and a new execution starts. The gap is bounded by each sequence's `timeoutMinutes`.
