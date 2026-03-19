# create-mailshot

## 1.0.4

### Patch Changes

- [`4279a60`](https://github.com/mdwt/mailshot/commit/4279a600302e6013896b0db3833b244c340befd9) Thanks [@mdwt](https://github.com/mdwt)! - Fix deploy workflow to avoid pnpm built-in deploy command collision

## 1.0.3

### Patch Changes

- [`65a90d2`](https://github.com/mdwt/mailshot/commit/65a90d2a38dab4e76cebe466c54d7e453b20a37a) Thanks [@mdwt](https://github.com/mdwt)! - Remove SSM parameter dependency and fix post-setup guidance to show correct workflow

## 1.0.2

### Patch Changes

- Add frontmatter descriptions to all skills for reliable auto-triggering

## 1.0.0

### Major Changes

- Remove SSM Parameter Store in favour of Lambda environment variables for all runtime config

## 0.4.0

### Minor Changes

- [`c6e982d`](https://github.com/mdwt/mailshot/commit/c6e982de16b546ce00292c90ba5d736efa99823a) Thanks [@mdwt](https://github.com/mdwt)! - Use dotenv-cli in scaffolded projects to load .env before CDK commands

## 0.2.9

### Patch Changes

- Output cdk.out to build/ directory in scaffolded projects, remove hello-world example references, fix create-sequence skill instructions

## 0.2.8

### Patch Changes

- Fix scaffolded project build issues: add esbuild for CDK Lambda bundling, add pnpm.onlyBuiltDependencies, fix create-sequence skill to place sequence.config.ts at sequence root (not src/), fix render script to use \_\_dirname instead of process.cwd(), add @types/node to sequence template

## 0.2.7

### Patch Changes

- Use project name in scaffolded README and CLAUDE.md headings

## 0.2.6

### Patch Changes

- Add README and improve CLAUDE.md in scaffolded project template

## 0.2.5

### Patch Changes

- Add @types/node to template devDependencies for IDE typecheck support

## 0.2.4

### Patch Changes

- Add root tsconfig.json to template so IDEs can check bin/app.ts

## 0.2.3

### Patch Changes

- Rename project to mailshot and bundle Claude Code skills in scaffolded projects

## 0.2.2

### Patch Changes

- Add packageManager field to scaffolded project template

## 0.2.1

### Patch Changes

- Fix template dependency versions to match published packages

## 0.2.0

### Minor Changes

- [`72d23af`](https://github.com/mdwt/mailshot/commit/72d23af8e07ab379c794d2918990f7a517a5fc85) Thanks [@mdwt](https://github.com/mdwt)! - Publish framework packages to npm and add create-mailshot CLI
