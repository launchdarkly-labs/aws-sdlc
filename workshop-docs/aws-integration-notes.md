# AWS Integration Notes

Notes for AWS workshop maintainers on what may need to change to support the LaunchDarkly integration.

---

## Overview

The LaunchDarkly integration adds an AI-powered book recommendations feature that demonstrates runtime AI configuration. This requires minimal changes to the existing workshop infrastructure.

---

## Infrastructure Changes

### 1. Lambda Environment Variables

The recommendations Lambda needs access to LaunchDarkly. Add support for:

```typescript
environment: {
  LAUNCHDARKLY_SDK_KEY: process.env.LAUNCHDARKLY_SDK_KEY || '',
  // ... existing vars
}
```

### 2. Bedrock Model Access

The feature uses Claude models via Bedrock. Ensure participants have:
- Bedrock access enabled in their AWS account
- Model access granted for: `us.anthropic.claude-3-5-sonnet-20241022-v2:0`

The Lambda needs this IAM policy:
```typescript
new iam.PolicyStatement({
  actions: ['bedrock:InvokeModel'],
  resources: ['arn:aws:bedrock:*::foundation-model/*'],
})
```

**IAM Note for Workshop Roles:** The `WSParticipantRole` may need additional Bedrock permissions. If participants see:
```
User: arn:aws:sts::343218213661:assumed-role/WSParticipantRole/Participant is not authorized
to perform: bedrock:ListMarketplaceModelEndpoints because no identity-based policy allows
the bedrock:ListMarketplaceModelEndpoints action
```

Add these actions to the participant role policy:
```typescript
actions: [
  'bedrock:InvokeModel',
  'bedrock:ListMarketplaceModelEndpoints',
  'bedrock:ListFoundationModels'
]
```

### 3. DynamoDB Tables

The recommendations handler reads from existing tables:
- `BOOKS_TABLE` - Book catalog (already exists in workshop)
- `ORDERS_TABLE` - User order history (already exists in workshop)

No new tables required.

---

## Workshop Flow Integration

### Where LaunchDarkly Fits

| Workshop Phase | LaunchDarkly Activity |
|----------------|----------------------|
| Prerequisites | Create LD account, get SDK key |
| Construction | Create AI Config, generate recommendations feature |
| Operations | Demo runtime switching between variations |

---

## Dependencies to Add

If using a shared `package.json`, these dependencies are needed:

```json
{
  "@launchdarkly/node-server-sdk": "^9.10.10",
  "@launchdarkly/server-sdk-ai": "^0.16.7"
}
```

These are already specified in the spec, so the coding assistant should include them.
