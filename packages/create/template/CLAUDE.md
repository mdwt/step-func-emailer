# {{PROJECT_NAME}}

A [mailshot](https://github.com/mdwt/mailshot) project — serverless email sequences on AWS, managed through Claude Code.

## Commands

```bash
pnpm build                    # Build all sequences (compiles TS + renders templates to build/)
pnpm typecheck                # Typecheck all packages
npx cdk synth                 # Synthesize CloudFormation (reads .env for AWS_PROFILE)
npx cdk deploy                # Deploy to AWS
npx cdk deploy --require-approval never  # Deploy without confirmation
```

Single sequence:

```bash
pnpm --filter @mailshot/<sequenceId> build      # Build one sequence
pnpm --filter @mailshot/<sequenceId> dev        # React Email dev server (if using React Email)
pnpm --filter @mailshot/<sequenceId> typecheck  # Typecheck one sequence
```

## Project structure

- `sequences/` — email sequences, each in its own directory with `sequence.config.ts`
- `bin/app.ts` — CDK entry point, loads `.env` and auto-discovers sequences
- `.env` — AWS configuration (account, region, SES, resource names). Run `/setup-env` to generate
- `build/` — generated artifacts (template HTML, CDK output). Gitignored
- `tsconfig.base.json` — shared TypeScript config, extended by each sequence

## How sequences work

Each sequence is a directory under `sequences/<sequenceId>/` containing:

- `sequence.config.ts` — typed definition (trigger event, steps, delays, branches)
- `src/emails/*.tsx` (or any HTML source) — email templates
- `src/render.ts` — renders templates to `build/<sequenceId>/templates/*.html`
- `package.json` — declares the sequence as a workspace package

CDK auto-discovers all sequences from `sequences/*/sequence.config.ts`. No manual registration needed.

## Templates

mailshot sends HTML files with [LiquidJS](https://liquidjs.com/) variables rendered at send time. How you produce the HTML is up to you — React Email, MJML, hand-written HTML, whatever. The render script just needs to output `.html` files to `build/<sequenceId>/templates/`.

Available Liquid variables in every template:

- `{{ firstName }}` — subscriber's first name
- `{{ unsubscribeUrl }}` — one-click unsubscribe link (HMAC-signed, 90-day expiry)
- Any custom attributes passed via the triggering event's `subscriberMapping.attributes`

## Sequence config types

Steps: `send`, `wait`, `choice` (branch on event data), `condition` (branch on DynamoDB lookup)

Events: fire-and-forget emails triggered by EventBridge events during a running sequence

See `@mailshot/shared` for the full `SequenceDefinition` type.

## Key conventions

- All packages use CommonJS with Node16 module resolution
- TypeScript strict mode, target ES2022, Node 22 runtime
- Sequence packages use `@mailshot/<sequenceId>` naming and `workspace:*` for shared deps
- The CDK stack reads all config from `.env` — no hardcoded values in `bin/app.ts`
- `AWS_PROFILE` from `.env` must be set for `cdk synth` and `cdk deploy`
