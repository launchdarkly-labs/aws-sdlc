# LaunchDarkly Feature Flags - Operations Phase

**Insert after: Operations Overview**

This tutorial adds feature flags to control the retail store app's intentional issues.

---

## Background: The Three Issues

The workshop deploys a retail store app with **three intentional problems** for you to diagnose:

| Issue | What You See | Root Cause |
|-------|--------------|------------|
| **A** | Catalog shows errors | Catalog service scaled to 0 replicas |
| **B** | Requests timeout | Missing security group rule |
| **C** | ALB returns 502 | Wrong health check path |

Normally, you'd fix these by editing infrastructure code. With feature flags, instructors can fix/unfix them instantly from a dashboard.

---

## Step 1: Create the Feature Flags

### 1a. Ask Your AI Assistant

In Claude Code, Cursor, or Kiro, type:

```
Create these LaunchDarkly feature flags:

1. catalog-service-enabled
   - Type: boolean
   - Default: false
   - Description: When true, scales catalog service to 1 replica

2. enable-security-group-fix
   - Type: boolean
   - Default: false
   - Description: When true, adds the missing security group rule

3. use-correct-health-check
   - Type: boolean
   - Default: false
   - Description: When true, uses /actuator/health instead of /health
```

### 1b. Verify in LaunchDarkly

1. Go to **https://app.launchdarkly.com**
2. Click **Feature flags** in the left sidebar
3. You should see your three flags

---

## Step 2: Understand How Flags Control Infrastructure

The retail store app checks these flags when it starts up:

```
┌─────────────────────────────────────────────────────────────┐
│                    LaunchDarkly                             │
│                                                             │
│  catalog-service-enabled: false ──────┐                     │
│  enable-security-group-fix: false ────┼──── Dashboard       │
│  use-correct-health-check: false ─────┘    (you control)    │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ App checks flags at startup
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Retail Store App                         │
│                                                             │
│  if catalog-service-enabled:                                │
│      scale catalog to 1                                     │
│  else:                                                      │
│      scale catalog to 0  ← Issue A                          │
│                                                             │
│  if enable-security-group-fix:                              │
│      add security group rule                                │
│  else:                                                      │
│      missing rule  ← Issue B                                │
│                                                             │
│  if use-correct-health-check:                               │
│      health_path = "/actuator/health"                       │
│  else:                                                      │
│      health_path = "/health"  ← Issue C (wrong path)        │
└─────────────────────────────────────────────────────────────┘
```

---

## Step 3: Add LaunchDarkly to the App (If Not Already Done)

### 3a. Check if SDK is Installed

Look in the app's package.json or requirements.txt for LaunchDarkly.

**For Node.js apps:**
```bash
npm install @launchdarkly/node-server-sdk
```

**For Python apps:**
```bash
pip install launchdarkly-server-sdk
```

### 3b. Initialize the Client

**Node.js example:**

```javascript
// config/launchdarkly.js
const LaunchDarkly = require('@launchdarkly/node-server-sdk');

// Get SDK key from environment or AWS Secrets Manager
const sdkKey = process.env.LAUNCHDARKLY_SDK_KEY;

const client = LaunchDarkly.init(sdkKey);

async function getFlag(flagKey, userId, defaultValue) {
    await client.waitForInitialization();

    const context = {
        kind: 'user',
        key: userId
    };

    return await client.variation(flagKey, context, defaultValue);
}

module.exports = { getFlag };
```

**Python example:**

```python
# config/launchdarkly.py
import ldclient
from ldclient import Context
from ldclient.config import Config

# Get SDK key from environment or AWS SSM
sdk_key = os.environ.get('LAUNCHDARKLY_SDK_KEY')

ldclient.set_config(Config(sdk_key))
client = ldclient.get()

def get_flag(flag_key, user_id, default_value):
    context = Context.builder(user_id).build()
    return client.variation(flag_key, context, default_value)
```

---

## Step 4: Use Flags in Infrastructure Code

### 4a. Example: Catalog Service (Issue A)

**Before (hardcoded):**

```typescript
// cdk/lib/catalog-service.ts
const catalogService = new ecs.FargateService(this, 'CatalogService', {
    desiredCount: 0,  // Hardcoded to 0 - causes Issue A
    // ...
});
```

**After (with flag):**

```typescript
// cdk/lib/catalog-service.ts
const { getFlag } = require('./launchdarkly');

const catalogEnabled = await getFlag('catalog-service-enabled', 'workshop', false);

const catalogService = new ecs.FargateService(this, 'CatalogService', {
    desiredCount: catalogEnabled ? 1 : 0,  // Controlled by flag!
    // ...
});
```

### 4b. Example: Security Group (Issue B)

**Before (missing rule):**

```typescript
// cdk/lib/security-groups.ts
const backendSg = new ec2.SecurityGroup(this, 'BackendSG', {
    // No inbound rule from frontend - causes Issue B
});
```

**After (with flag):**

```typescript
const sgFixEnabled = await getFlag('enable-security-group-fix', 'workshop', false);

const backendSg = new ec2.SecurityGroup(this, 'BackendSG', {});

if (sgFixEnabled) {
    backendSg.addIngressRule(
        frontendSg,
        ec2.Port.tcp(8080),
        'Allow frontend to backend'
    );
}
```

### 4c. Example: Health Check (Issue C)

**Before (wrong path):**

```typescript
// cdk/lib/load-balancer.ts
const healthCheck = {
    path: '/health',  // Wrong path - causes Issue C
    // ...
};
```

**After (with flag):**

```typescript
const correctHealthCheck = await getFlag('use-correct-health-check', 'workshop', false);

const healthCheck = {
    path: correctHealthCheck ? '/actuator/health' : '/health',
    // ...
};
```

---

## Step 5: Test the Flags

### 5a. Start With All Issues Active

1. Go to LaunchDarkly → Feature flags
2. Make sure all three flags are **OFF** (false)
3. Deploy/restart the app
4. Verify you see all three issues:
   - Catalog errors
   - Timeouts
   - 502 errors

### 5b. Fix Issue C (Health Check)

1. In LaunchDarkly, find `use-correct-health-check`
2. Click the flag name to open it
3. Click the **toggle** to turn it ON
4. Click **Review and save** → **Save changes**
5. Wait ~30 seconds for ALB to detect healthy targets
6. Refresh the app - 502 errors should be gone!

### 5c. Fix Issue A (Catalog Service)

1. Turn ON `catalog-service-enabled`
2. Save changes
3. Wait for ECS to scale up the service (~1-2 minutes)
4. Refresh the app - products should appear!

### 5d. Fix Issue B (Security Group)

1. Turn ON `enable-security-group-fix`
2. Save changes
3. The security group rule is added immediately
4. Refresh the app - full connectivity restored!

---

## Step 6: Demo Mode - Reset and Repeat

### For Instructors

You can reset all issues instantly:

1. Go to LaunchDarkly → Feature flags
2. Turn OFF all three flags
3. The app returns to its broken state

This lets you:
- Demo the diagnosis process multiple times
- Let different groups of students investigate
- Control the pacing of the workshop

### Progressive Hints

Instead of fixing issues, reveal hints progressively:

1. Start with all issues active
2. After 10 minutes: Turn on `use-correct-health-check` (easiest fix)
3. After 20 minutes: Turn on `catalog-service-enabled`
4. After 30 minutes: Turn on `enable-security-group-fix`

---

## What You Learned

- Feature flags control application behavior without code changes
- Flags can control infrastructure settings (replicas, security rules, config)
- You can fix and unfix issues instantly from a dashboard
- This is useful for demos, workshops, and gradual rollouts

---

## Real-World Use Cases

What you just did is commonly used in production:

| Use Case | How Flags Help |
|----------|---------------|
| **Gradual Rollouts** | Release to 1% of users, then 10%, then 100% |
| **Kill Switches** | Instantly disable a broken feature |
| **A/B Testing** | Show different UIs to different users |
| **Beta Features** | Enable features only for beta testers |
| **Ops Control** | Let ops team control system behavior |

---

## Troubleshooting

### Flags not taking effect

- Make sure the flag is turned ON in LaunchDarkly
- Check your SDK key is correct
- Verify the flag key in code matches LaunchDarkly exactly (case-sensitive!)
- The app may need to restart to pick up flag changes

### "Flag not found" error

- Double-check the flag exists in LaunchDarkly
- Make sure you're in the right LaunchDarkly project
- Verify the environment (Test vs Production)

### Changes are slow

- ECS service scaling takes 1-2 minutes
- ALB health checks take ~30 seconds
- Security group changes are immediate

---

## Next Steps

Congratulations! You've completed the LaunchDarkly integration:

- **Construction Phase**: AI Configs for model switching
- **Operations Phase**: Feature flags for issue control

For more LaunchDarkly features, check out:
- [Targeting rules](https://docs.launchdarkly.com/home/flags/targeting)
- [Experimentation](https://docs.launchdarkly.com/home/experimentation)
- [Metrics and monitoring](https://docs.launchdarkly.com/home/metrics)
