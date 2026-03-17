# Create Sequence

Create a complete email sequence from a natural language description — generates React Email templates, CDK state machine, EventBridge rule, and stack wiring.

## Usage

```
/create-sequence <description of your email sequence>
```

Example: `/create-sequence A trial expiring sequence triggered by trial.expiring — send a "trial ending soon" email immediately, then a "last chance" email after 2 days, then a "trial expired" email after 3 more days`

## Instructions

You are generating all the code needed to deploy a new email sequence. Follow this workflow exactly.

### Step 1: Parse the input

Extract from the user's description:
- **sequenceId** — unique kebab-case ID (e.g., `trial-expiring`, `onboarding`)
- **triggerEvent** — EventBridge detail-type (e.g., `trial.expiring`, `customer.created`)
- **emails** — ordered list, each with:
  - `templateName` — kebab-case slug (e.g., `trial-ending-soon`)
  - `subject` — email subject line
  - `previewText` — preview/preheader text
  - `body` — paragraphs and content for the email body
  - `delayBefore` — delay before this email (`0` for immediate, or e.g. `2 days`, `1 week`)

If any of these are missing or ambiguous, ask the user to clarify before generating code. Present your parsed interpretation to the user and confirm before proceeding.

### Step 2: Generate React Email templates

For each email, create a file at:
```
apps/hello-world/src/emails/<sequenceId>/<templateName>.tsx
```

Follow the exact pattern from `apps/hello-world/src/emails/placeholder.tsx`:

```tsx
import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Link,
  Hr,
  Preview,
  Button,
  Section,
} from "@react-email/components";
import * as React from "react";

interface <PascalName>EmailProps {
  firstName?: string;
  unsubscribeUrl?: string;
}

export default function <PascalName>Email({
  firstName = "there",
  unsubscribeUrl = "#",
}: <PascalName>EmailProps) {
  return (
    <Html>
      <Head />
      <Preview><previewText></Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={paragraph}>Hey {firstName},</Text>
          {/* Body content paragraphs here */}
          <Hr style={hr} />
          <Text style={footer}>
            <Link href={unsubscribeUrl} style={footerLink}>
              Unsubscribe
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main: React.CSSProperties = {
  backgroundColor: "#ffffff",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container: React.CSSProperties = {
  margin: "0 auto",
  padding: "24px 20px",
  maxWidth: "580px",
};

const paragraph: React.CSSProperties = {
  fontSize: "16px",
  lineHeight: "1.5",
  color: "#333333",
};

const hr: React.CSSProperties = {
  borderColor: "#eeeeee",
  margin: "32px 0",
};

const footer: React.CSSProperties = {
  fontSize: "12px",
  color: "#999999",
  marginTop: "40px",
};

const footerLink: React.CSSProperties = {
  color: "#999999",
};
```

Use `<Text style={paragraph}>` for body paragraphs. Use `<Button>` for CTAs if the user specifies them. Use `<Link>` for inline links.

### Step 3: Verify render.ts supports subdirectories

Check that `apps/hello-world/src/render.ts` recursively walks subdirectories under `emails/`. If it only reads flat `.tsx` files, update it to use a recursive walk that outputs to `out/<sequenceId>/<templateName>.html`, preserving the directory structure so template keys match S3 paths.

### Step 4: Add state machine to CDK

Edit `packages/cdk/lib/constructs/state-machines.ts`:

1. Add a new public property: `public readonly <camelId>Sequence: sfn.StateMachine;`
2. Build the chain following the onboarding pattern exactly:
   - **Register** task with `sequenceId: "<sequenceId>"`
   - For each email: `createSendTask()` with templateKey `<sequenceId>/<templateName>` and subject
   - **Wait** states between emails (skip for the first email if delay is 0)
   - **Complete** task with `sequenceId: "<sequenceId>"`
   - **Succeed** state
3. Use **unique construct IDs** — prefix all IDs with a PascalCase version of the sequenceId (e.g., `TrialExpRegister`, `TrialExpSendEmail1`, `TrialExpWait1`)
4. Create the `sfn.StateMachine` with name `<PascalId>Sequence` and 30-day timeout

### Step 5: Add EventBridge rule

Edit `packages/cdk/lib/constructs/event-bus.ts`:

1. Add the new state machine to `EventBusProps`: `<camelId>StateMachine: sfn.StateMachine;`
2. Add a new rule:

```typescript
new events.Rule(this, "<PascalId>Rule", {
  eventBus: this.eventBus,
  ruleName: "<sequenceId>-<trigger-slug>",
  eventPattern: {
    detailType: ["<triggerEvent>"],
  },
  targets: [
    new targets.SfnStateMachine(props.<camelId>StateMachine, {
      input: events.RuleTargetInput.fromObject({
        subscriber: {
          email: events.EventField.fromPath("$.detail.email"),
          firstName: events.EventField.fromPath("$.detail.firstName"),
          attributes: events.EventField.fromPath("$.detail"),
        },
      }),
    }),
  ],
});
```

### Step 6: Wire in the stack

Edit `packages/cdk/lib/step-func-emailer-stack.ts`:

1. Pass the new state machine to EventBusConstruct:
   ```
   <camelId>StateMachine: stateMachines.<camelId>Sequence,
   ```
2. Grant read permissions:
   ```
   stateMachines.<camelId>Sequence.grantRead(lambdas.sendEmailFn);
   ```

### Step 7: Verify

Run these commands and fix any errors:

```bash
pnpm -r build
pnpm --filter @step-func-emailer/cdk synth
pnpm --filter @step-func-emailer/templates render
```

All three must succeed before the skill is complete.
