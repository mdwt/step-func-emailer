# @mailshot/handlers

## 1.3.0

### Minor Changes

- [`7514d53`](https://github.com/mdwt/mailshot/commit/7514d53ffe2e710bc0a124ac337102e076ac3a41) Thanks [@mdwt](https://github.com/mdwt)! - Add inbound reply tracking as an engagement event type

### Patch Changes

- Updated dependencies [[`7514d53`](https://github.com/mdwt/mailshot/commit/7514d53ffe2e710bc0a124ac337102e076ac3a41)]:
  - @mailshot/shared@1.3.0

## 1.2.0

### Minor Changes

- [#4](https://github.com/mdwt/mailshot/pull/4) [`b85c746`](https://github.com/mdwt/mailshot/commit/b85c746ad65474200d351e06ada3368b6df5f220) Thanks [@mdwt](https://github.com/mdwt)! - Add sequence exit events to remove subscribers from sequences on specific EventBridge events

### Patch Changes

- Updated dependencies [[`b85c746`](https://github.com/mdwt/mailshot/commit/b85c746ad65474200d351e06ada3368b6df5f220)]:
  - @mailshot/shared@1.2.0

## 1.0.3

### Patch Changes

- [`65a90d2`](https://github.com/mdwt/mailshot/commit/65a90d2a38dab4e76cebe466c54d7e453b20a37a) Thanks [@mdwt](https://github.com/mdwt)! - Remove SSM parameter dependency and fix post-setup guidance to show correct workflow

- Updated dependencies [[`65a90d2`](https://github.com/mdwt/mailshot/commit/65a90d2a38dab4e76cebe466c54d7e453b20a37a)]:
  - @mailshot/shared@1.0.3

## 1.0.1

### Patch Changes

- Fix circular dependency in CDK deploy caused by UnsubscribeFn referencing its own Function URL

## 1.0.0

### Major Changes

- Remove SSM Parameter Store in favour of Lambda environment variables for all runtime config

### Patch Changes

- Updated dependencies []:
  - @mailshot/shared@1.0.0

## 0.3.0

### Minor Changes

- [`19b6f05`](https://github.com/mdwt/mailshot/commit/19b6f05b176871d05d40bc21417dbcc30b96e9d9) Thanks [@mdwt](https://github.com/mdwt)! - Guard sequence registration against unsubscribed and suppressed subscribers

## 0.2.3

### Patch Changes

- Rename project to mailshot and bundle Claude Code skills in scaffolded projects

- Updated dependencies []:
  - @mailshot/shared@0.2.3

## 0.2.0

### Minor Changes

- [`72d23af`](https://github.com/mdwt/mailshot/commit/72d23af8e07ab379c794d2918990f7a517a5fc85) Thanks [@mdwt](https://github.com/mdwt)! - Publish framework packages to npm and add create-mailshot CLI

### Patch Changes

- Updated dependencies [[`72d23af`](https://github.com/mdwt/mailshot/commit/72d23af8e07ab379c794d2918990f7a517a5fc85)]:
  - @mailshot/shared@0.2.0
