# AWS Integration Notes

Notes for AWS workshop maintainers on what may need to change to support the LaunchDarkly integration with the **new** Kiro-driven AI-DLC workshop (Bedrock AgentCore agent, generated `packages/*` monorepo).

The LaunchDarkly integration only touches the **generated AnyCompanyRead app**, not the workshop's own agent runtime (which now lives in `code/agentcore-runtime/icode-agent/`). No changes required to the AgentCore stack itself.

---

## Infrastructure Changes (in the generated `anycompanyread` app)

### 1. Lambda IAM + Environment

The generated `RecommendationsConstruct` adds these to the recommendations Lambda:

```typescript
environment: {
  ORDERS_TABLE: props.ordersTable.tableName,
  BOOKS_TABLE: props.booksTable.tableName,
  LD_SDK_KEY_PARAM: '/anycompanyread/launchdarkly/sdk-key',
}
```

```typescript
new iam.PolicyStatement({
  actions: ['ssm:GetParameter'],
  resources: [`arn:aws:ssm:${region}:${account}:parameter/anycompanyread/launchdarkly/*`],
}),
new iam.PolicyStatement({
  actions: ['bedrock:InvokeModel'],
  resources: [
    `arn:aws:bedrock:${region}::foundation-model/*`,
    `arn:aws:bedrock:*::foundation-model/*`,
    `arn:aws:bedrock:${region}:${account}:inference-profile/*`,
  ],
}),
```

> The `us.*` inference-profile ARNs are required for cross-region inference profile model IDs like `us.anthropic.claude-3-5-sonnet-20241022-v2:0`. Without them, you'll see `AccessDeniedException` despite having `foundation-model/*`.

### 2. Bedrock Model Access

Participants need Bedrock model access enabled in their AWS account for:

- `us.anthropic.claude-3-5-sonnet-20241022-v2:0`
- `us.anthropic.claude-opus-4-20250514-v1:0`

**IAM Note for Workshop Roles:** the `WSParticipantRole` may need the actions below if participants hit `ListMarketplaceModelEndpoints` errors:

```typescript
actions: [
  'bedrock:InvokeModel',
  'bedrock:ListMarketplaceModelEndpoints',
  'bedrock:ListFoundationModels',
]
```

### 3. DynamoDB Tables

The recommendations handler reads from tables the workshop already provisions:

- `Books` (PK: `bookId`) — already exists
- `Orders` (PK: `userId`, SK: `orderId`) — already exists

No new tables required. The handler uses `ScanCommand` on `Books` (catalog of ~50) and `QueryCommand` on `Orders` (user history, limit 10).

### 4. API Route

The construct adds `GET /recommendations` to the existing REST API with the Cognito authorizer attached (matches the workshop's pattern for `/cart`, `/checkout`, `/orders`).

### 5. Frontend Config

The generated frontend reads `config.json` at runtime (the workshop's pattern for `apiUrl`). To support feature flags later, the config should also include:

```json
{
  "apiUrl": "https://...",
  "ldClientSideId": "..."
}
```

Or the agent can read `VITE_LD_CLIENT_SIDE_ID` from `import.meta.env` at build time — your call.

---

## Workshop Flow Integration

| Workshop Phase | LaunchDarkly Activity |
|---|---|
| Setup / Prerequisites | Create LD account, get API token, install agent skills |
| Inception (after User Stories) | Create LD project + AI Config (Kiro skills, MCP, or dashboard) |
| Construction (before Code Generation) | Add `ai-recommendations-spec.md` to context |
| Construction (before Deploy) | Store SDK key in AWS SSM |
| Operations Part 1 | Demo runtime model switching (no redeploy) |
| Operations Part 2 | Add a feature flag for the frontend |

---

## Dependencies the Generated App Needs

`packages/backend/package.json`:

```json
{
  "@launchdarkly/node-server-sdk": "^9.10.14",
  "@launchdarkly/server-sdk-ai": "^0.20.0",
  "@aws-sdk/client-bedrock-runtime": "^3.712.0",
  "@aws-sdk/client-ssm": "^3.712.0"
}
```

`packages/frontend/package.json`:

```json
{
  "launchdarkly-react-client-sdk": "^3.9.1"
}
```

These are already specified in `workshop-docs/ai-recommendations-spec.md`, so Kiro should include them when generating the app.

---

## Things That Did NOT Need to Change

- The Bedrock AgentCore workshop agent — LaunchDarkly only touches the **generated app**, not the agent runtime.
- The Operations Phase ECS sample app (catalog/UI services) — the three intentional issues remain unchanged. LaunchDarkly's Operations Part 2 flag is layered on top of the AnyCompanyRead frontend, not the ECS retail store demo.
- DynamoDB schemas, Cognito user pool, CloudFront/S3 hosting.
