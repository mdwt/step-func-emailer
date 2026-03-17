# Setup Environment

Interactive setup wizard that configures the `.env` file by discovering AWS resources from a chosen profile. Queries STS, SES, and SNS to auto-populate account ID, region, verified domains, from addresses, and configuration sets.

## Usage

```
/setup-env
```

## Instructions

You are configuring the project's `.env` file by discovering real AWS resources. Follow this workflow exactly, using `AskUserQuestion` for each decision point.

### Step 1: Choose AWS profile

Run `aws configure list-profiles` to get available profiles. Present them as options using `AskUserQuestion` (pick the most likely 3-4 profiles, or ask the user to type theirs if many exist).

Once chosen, run:

```bash
aws sts get-caller-identity --profile <profile> --output json
aws configure get region --profile <profile>
```

Extract the **account ID** and **region**. If the STS call fails (expired creds, MFA needed), tell the user and stop.

### Step 2: Discover SES identities

```bash
aws sesv2 list-email-identities --profile <profile> --region <region> --output json
```

Filter to only **verified** identities (`VerificationStatus: SUCCESS`, `SendingEnabled: true`). Separate into:

- **Domains** (`IdentityType: DOMAIN`)
- **Email addresses** (`IdentityType: EMAIL_ADDRESS`)

If no verified identities are found, warn the user that SES is not set up in this region. Ask if they want to try a different region or continue with manual values.

### Step 3: Choose sending domain / from email

Present the verified domains and email addresses to the user via `AskUserQuestion`:

**"Which domain should emails be sent from?"** — list verified domains. This determines what `DEFAULT_FROM_EMAIL` will use (e.g., choosing `example.com` means the from address will be `something@example.com`).

Then ask: **"What should the default from email address be?"** — offer suggestions based on the chosen domain (e.g., `hello@<domain>`, `noreply@<domain>`) plus any verified individual email addresses on that domain.

Then ask: **"What should the default from display name be?"** — suggest the domain name titlecased, or common patterns.

Then ask: **"What reply-to email address should be used? (optional)"** — suggest `support@<domain>`, `help@<domain>`, or leave blank. This sets `REPLY_TO_EMAIL`, which adds a `Reply-To` header to all outgoing emails. If left blank, the variable is omitted from `.env`.

### Step 4: Discover existing SES configuration sets

```bash
aws sesv2 list-configuration-sets --profile <profile> --region <region> --output json
```

If configuration sets exist, ask the user if they want to **reuse an existing one** or **create a new one** (the CDK stack will create it). If they choose an existing one, use that name. Otherwise, default to `step-func-emailer-config`.

### Step 5: Choose resource names

Ask the user for a **project prefix** to use for naming resources. Default to `step-func-emailer`. This prefix will be used to generate:

- `STACK_NAME` → `<Prefix>` (PascalCase, e.g., `StepFuncEmailer`)
- `TABLE_NAME` → `<Prefix>` (PascalCase)
- `EVENTS_TABLE_NAME` → `<Prefix>-events`
- `TEMPLATE_BUCKET_NAME` → `<prefix>-templates-<accountId>` (lowercase with account ID for uniqueness)
- `EVENT_BUS_NAME` → `<prefix>-bus`
- `SES_CONFIG_SET_NAME` → from step 4, or `<prefix>-config`
- `SNS_TOPIC_NAME` → `<prefix>-ses-notifications`
- `SSM_PREFIX` → `/<prefix>`

Present the generated names to the user and let them confirm or adjust.

### Step 6: Generate unsubscribe secret

Generate a random secret for HMAC-SHA256 unsubscribe token signing:

```bash
openssl rand -hex 32
```

### Step 7: Write the `.env` file

Check if `.env` already exists. If it does, show a diff of what will change and ask for confirmation before overwriting.

Write the `.env` file with all values:

```
ACCOUNT=<accountId>
REGION=<region>
STACK_NAME=<stackName>
TABLE_NAME=<tableName>
EVENTS_TABLE_NAME=<eventsTableName>
TEMPLATE_BUCKET_NAME=<templateBucketName>
EVENT_BUS_NAME=<eventBusName>
SES_CONFIG_SET_NAME=<sesConfigSetName>
SNS_TOPIC_NAME=<snsTopicName>
DEFAULT_FROM_EMAIL=<fromEmail>
DEFAULT_FROM_NAME=<fromName>
REPLY_TO_EMAIL=<replyToEmail>  # omit line if blank
UNSUBSCRIBE_SECRET=<secret>
SSM_PREFIX=<ssmPrefix>
```

### Step 8: Verify

Run a quick sanity check:

```bash
source .env && echo "Account: $ACCOUNT | Region: $REGION | From: $DEFAULT_FROM_EMAIL"
```

Print a summary:

```
Environment configured:
- AWS Account: <accountId> (profile: <profile>)
- Region: <region>
- From: <fromName> <fromEmail>
- Stack: <stackName>
- SES Config Set: <sesConfigSetName> (existing/new)

Run /deploy when you're ready to deploy.
```
