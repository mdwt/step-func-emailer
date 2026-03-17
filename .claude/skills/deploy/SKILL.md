# Deploy

Full deployment workflow: validate all sequences, build everything, verify templates, and deploy to AWS.

## Usage

```
/deploy
```

## Instructions

Run through each phase below in order. Stop at the first failure with a clear error message. Always ask for confirmation before the final `cdk deploy` step.

### Phase 1: Validate all sequences

Run `/validate-sequence` (no argument — validates all sequences). If any sequence fails validation, stop and report the errors. Do not proceed to build/deploy with invalid configs.

### Phase 2: Build shared package

```bash
pnpm --filter @step-func-emailer/shared build
```

This must succeed first since all other packages depend on it.

### Phase 3: Build all sequences

For each sequence in `sequences/*/`, run:

```bash
pnpm --filter @step-func-emailer/<sequenceId> build
```

This compiles TypeScript and renders React Email templates to `templates/<sequenceId>/*.html`. Report any build failures with the full error output.

### Phase 4: Verify all template HTML files

After building, collect every `templateKey` from every `sequence.config.ts` (send steps recursively + events) and verify the corresponding `templates/<templateKey>.html` file exists.

If any are missing, report which templateKeys are missing and which sequence they belong to. This catches cases where:

- A template was referenced in the config but the .tsx file was never created
- The render script failed silently for a specific template
- A templateKey has a typo

### Phase 5: Build CDK

```bash
pnpm --filter @step-func-emailer/cdk build
```

### Phase 6: CDK synth

```bash
pnpm --filter @step-func-emailer/cdk synth
```

Review the synth output for any errors or warnings. If synth fails, report the error and stop.

### Phase 7: Confirm and deploy

Show the user a summary of what will be deployed:

- List of sequences (with step count and event count for each)
- Total number of templates
- Any changes detected (new sequences, modified configs)

Ask: **"Ready to deploy? This will update the live AWS stack."**

Only proceed after the user confirms.

### Phase 8: Deploy

```bash
pnpm --filter @step-func-emailer/cdk deploy
```

This single command handles everything:

- Updates DynamoDB tables if needed
- Deploys Lambda functions
- Creates/updates Step Functions state machines
- Creates/updates EventBridge rules
- Uploads all rendered HTML templates to S3 (via CDK BucketDeployment)
- Updates SSM parameters
- Updates SES configuration

### Phase 9: Post-deploy verification

After deploy completes, report:

- Stack outputs (table name, template bucket, unsubscribe URL, event bus name)
- Any CloudFormation warnings

```
Deploy complete.
- Stack: <stackName>
- Sequences: <list>
- Templates uploaded to: <bucketName>
```
