# LaunchDarkly Feature Flags for the Operations Phase

Add feature flags to the retail store sample app deployed on ECS.

## The Fake Web App

The workshop deploys a retail store app (`cdk/lib/cdk-construct-icode-fake-webapp.ts`) on ECS Fargate with **three intentional issues** for participants to diagnose:

| Issue | Symptom | Root Cause |
|-------|---------|------------|
| **A** | Catalog shows errors | `catalog` service scaled to 0 |
| **B** | Requests timeout | Missing security group rule |
| **C** | ALB returns 502 | Wrong health check path (`/health` vs `/actuator/health`) |

Feature flags let you control these issues dynamically.

---

## Integration: Add Feature Flags

### 1. Install SDK

Add to the app's dependencies:
```bash
npm install @launchdarkly/node-server-sdk
```

### 2. Initialize Client

```typescript
// src/config/launchdarkly.ts
import * as LaunchDarkly from '@launchdarkly/node-server-sdk';

const client = LaunchDarkly.init(process.env.LD_SDK_KEY!);

export async function getFlag(key: string, userId: string, defaultValue: boolean): Promise<boolean> {
  await client.waitForInitialization();
  const context = { kind: 'user', key: userId };
  return client.variation(key, context, defaultValue);
}
```

### 3. Create Flags

| Flag Key | Type | Purpose |
|----------|------|---------|
| `catalog-service-enabled` | Boolean | Control whether catalog service runs |
| `enable-security-group-fix` | Boolean | Toggle the SG rule fix |
| `use-correct-health-check` | Boolean | Toggle correct ALB health path |
| `load-generator-enabled` | Boolean | Control load generator |

---

## Use Case: Progressive Issue Resolution

### Scenario
Workshop participants use Kiro CLI to diagnose issues. Instructors can:

1. **Start with all issues active** (flags off)
2. **Reveal hints progressively** by toggling flags
3. **Instantly fix/unfix** issues for demos

### Example: Catalog Service Flag

```typescript
// In ECS service configuration
const catalogDesiredCount = await getFlag('catalog-service-enabled', 'workshop', false)
  ? 1
  : 0;
```

When instructor toggles `catalog-service-enabled` → catalog service scales up instantly.

---

## Setup in LaunchDarkly

### 1. Store SDK Key
```bash
aws ssm put-parameter \
  --name "/icode/launchdarkly/client-sdk-key" \
  --value "your-client-side-id" \
  --type SecureString
```

### 2. Create Flags

**catalog-service-enabled**
- Type: Boolean
- Default: `false` (issue active)
- Description: Scale catalog service to 1 when true

**enable-security-group-fix**
- Type: Boolean
- Default: `false` (issue active)
- Description: Add inbound rule to backend SG when true

**use-correct-health-check**
- Type: Boolean
- Default: `false` (issue active)
- Description: Use `/actuator/health` instead of `/health`

### 3. Targeting (Optional)

Target by workshop session:
- `session_id` = "morning" → all issues active
- `session_id` = "afternoon" → Issue C fixed (easier start)

---

## Demo Flow

### For Instructors

1. **Deploy app** with all flags off (all issues present)
2. Participants investigate using Kiro CLI
3. **Toggle flags** as hints or to demo fixes:
   - Toggle `use-correct-health-check` → ALB starts working
   - Toggle `catalog-service-enabled` → Products appear
   - Toggle `enable-security-group-fix` → Full connectivity

### For Participants

Same experience as manual fixing, but instructor can:
- Reset issues instantly
- Skip to specific issues
- Control pacing

---

## Alternative: UI Feature Flags

If the retail store has a React frontend:

```tsx
import { useFlags } from 'launchdarkly-react-client-sdk';

function ProductCatalog() {
  const { showAiRecommendations, newCheckoutFlow } = useFlags();

  return (
    <div>
      {showAiRecommendations && <AIRecommendations />}
      {newCheckoutFlow ? <NewCheckout /> : <LegacyCheckout />}
    </div>
  );
}
```

---

## Summary

| Phase | LaunchDarkly Feature | Value |
|-------|---------------------|-------|
| Construction | AI Configs | Switch models/prompts without redeploy |
| Operations | Feature Flags | Control infrastructure issues dynamically |

Both demonstrate runtime configuration without code changes.
