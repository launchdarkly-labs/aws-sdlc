# LaunchDarkly Integration for AWS AI-DLC Workshop

LaunchDarkly overlay for the [AWS AI-DLC Workshop](https://catalog.workshops.aws/ai-driven-development-lifecycle). Adds feature management without modifying the core workshop.

## Quick Start

### 1. Configure MCP

Add to your AI client (Claude Code, Cursor, etc.):

```json
{
  "mcpServers": {
    "LaunchDarkly feature management": {
      "type": "http",
      "url": "https://mcp.launchdarkly.com/mcp/fm"
    },
    "LaunchDarkly AI Configs": {
      "type": "http",
      "url": "https://mcp.launchdarkly.com/mcp/aiconfigs"
    }
  }
}
```

Or use quick install: [flags](https://mcp.launchdarkly.com/mcp/fm/install) | [AI Configs](https://mcp.launchdarkly.com/mcp/aiconfigs/install)

### 2. Follow the Tutorials

- **Construction Phase**: [AI Configs tutorial](workshop-docs/construction-ld-aiconfig.md) — runtime model/prompt switching
- **Operations Phase**: [Feature flags tutorial](workshop-docs/operations-ld-flags.md) — progressive rollout for the app

### 3. Use the Examples

- `examples/aiconfig-agent.py` — Python + Bedrock + LaunchDarkly AI Config
- `examples/frontend-flags.tsx` — React feature flags

## What's Here

```
├── workshop-docs/
│   ├── construction-ld-aiconfig.md   # AI Configs for iCode agents
│   └── operations-ld-flags.md        # Feature flags for retail app
└── examples/
    ├── aiconfig-agent.py             # Python + Bedrock example
    └── frontend-flags.tsx            # React feature flags example
```

## Design Decisions

**Why code generation agent?** Most visible output. Sonnet vs Opus produces noticeably different results.

For production evaluations, see [Custom Evals tutorial](https://launchdarkly.com/docs/tutorials/custom-evals-claude-code).

## Testing the Integration

### Prerequisites

- [LaunchDarkly account](https://launchdarkly.com/start-trial/)
- AWS AI-DLC workshop environment deployed
- Bedrock Claude models enabled in your AWS account

### Test 1: Construction Phase (AI Configs)

**Setup in LaunchDarkly:**
1. Create a new AI Config with key `aidlc-agent`
2. Add variations for different models:
   - `sonnet`: `us.anthropic.claude-3-5-sonnet-20241022-v2:0`
   - `opus`: `us.anthropic.claude-opus-4-20250514-v1:0`
3. Set default to `sonnet`

**Setup in AWS:**
```bash
# Store your SDK key in SSM
aws ssm put-parameter \
  --name "/icode/launchdarkly/sdk-key" \
  --value "sdk-your-key-here" \
  --type SecureString
```

**Modify the iCode agent:**
1. Edit `code/agent/common.py` per [construction-ld-aiconfig.md](workshop-docs/construction-ld-aiconfig.md)
2. Add dependencies to `code/agent/requirements.txt`:
   ```
   launchdarkly-server-sdk
   launchdarkly-server-sdk-ai
   ```

**Verify:**
1. Run a code generation task through iCode
2. Check CloudWatch logs for which model was used
3. Change the AI Config variation in LaunchDarkly dashboard
4. Run another task — should use the new model without redeploying

### Test 2: Operations Phase (Feature Flags)

**Setup in LaunchDarkly:**
Create these boolean flags (all default `false`):
- `catalog-service-enabled` — scales catalog service to 1 when true
- `enable-security-group-fix` — adds missing SG rule when true
- `use-correct-health-check` — uses `/actuator/health` when true

**Verify:**
1. Deploy the retail store app with all flags off (3 issues present)
2. Confirm issues exist:
   - Catalog shows errors (service scaled to 0)
   - Requests timeout (missing SG rule)
   - ALB returns 502 (wrong health check path)
3. Toggle `use-correct-health-check` → ALB should start returning 200
4. Toggle `catalog-service-enabled` → Products should appear
5. Toggle `enable-security-group-fix` → Full connectivity restored

### Standalone Example Test

Test the Python example without the full workshop:

```bash
cd examples
export LAUNCHDARKLY_SDK_KEY="sdk-your-key"
export AWS_REGION="us-west-2"
python aiconfig-agent.py
```

## Links

- [AWS AI-DLC Workshop](https://catalog.workshops.aws/ai-driven-development-lifecycle)
- [LaunchDarkly Docs](https://docs.launchdarkly.com)
- [Python AI SDK](https://docs.launchdarkly.com/sdk/ai/python)
- [React SDK](https://docs.launchdarkly.com/sdk/client-side/react)
