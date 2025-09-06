# OAuth Secrets Management Script

This script manages OAuth provider secrets in AWS Secrets Manager for the Clancy platform.

## Usage

### Using npm script (recommended)

```bash
npm run oauth:manage -- --help
```

### Direct execution

```bash
tsx scripts/manage-oauth-secrets.ts --help
```

## Examples

### Create/Update a Google OAuth secret

```bash
npm run oauth:manage -- \
  --provider-id google \
  --client-id "your-google-client-id" \
  --client-secret "your-google-client-secret" \
  --redirect-uri "https://your-domain.com/oauth/callback/google"
```

### Create/Update a Slack OAuth secret with signing secret

```bash
npm run oauth:manage -- \
  --provider-id slack \
  --client-id "your-slack-client-id" \
  --client-secret "your-slack-client-secret" \
  --redirect-uri "https://your-domain.com/oauth/callback/slack" \
  --signing-secret "your-slack-signing-secret"
```

### Specify environment

```bash
npm run oauth:manage -- \
  --provider-id microsoft \
  --client-id "your-microsoft-client-id" \
  --client-secret "your-microsoft-client-secret" \
  --redirect-uri "https://your-domain.com/oauth/callback/microsoft" \
  --environment production
```

## Arguments

### Required

- `--provider-id, -p`: Provider ID (e.g., google, slack, microsoft)
- `--client-id, -c`: OAuth client ID
- `--client-secret, -s`: OAuth client secret
- `--redirect-uri, -r`: OAuth redirect URI

### Optional

- `--signing-secret, -S`: Optional signing secret (required for some providers like Slack)
- `--environment, -e`: Environment (defaults to ENVIRONMENT env var or 'staging')

## Secret Path Pattern

Secrets are stored in AWS Secrets Manager using the pattern:

```
clancy/oauth/{environment}/{providerId}
```

For example:

- `clancy/oauth/staging/google`
- `clancy/oauth/production/slack`

## Prerequisites

1. AWS CLI configured with the `clancy` profile
2. Appropriate permissions to read/write secrets in AWS Secrets Manager
3. Environment variables set (if not using --environment flag)

## Behavior

- If a secret already exists, it will be updated with a new version
- If a secret doesn't exist, it will be created
- The script uses the same AWS configuration as the main application (region: us-east-1, profile: clancy)
