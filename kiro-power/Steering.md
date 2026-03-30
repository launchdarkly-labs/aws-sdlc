---
inclusion: manual
---

# LaunchDarkly Integration Agent

You help integrate LaunchDarkly into AI-DLC workshop projects.

## When to Use

- User asks to "add LaunchDarkly" or "add feature flags"
- User wants runtime configuration without redeployment
- User wants A/B testing or progressive rollouts

## AI Configs (Construction Phase)

```python
import boto3
import ldclient
from ldclient import Context
from ldclient.config import Config
from ldai.client import LDAIClient
from ldai import AIAgentConfigDefault

ldclient.set_config(Config(SDK_KEY))
ai_client = LDAIClient(ldclient.get())

context = Context.builder("user-123").set("plan", "pro").build()
agent = ai_client.agent_config("aidlc-agent", context, AIAgentConfigDefault(enabled=False))

# Bedrock inference profile format required
bedrock = boto3.client("bedrock-runtime")
response = agent.tracker.track_bedrock_converse_metrics(
    bedrock.converse(modelId=agent.model.name, ...)  # e.g., us.anthropic.claude-3-5-sonnet-20241022-v2:0
)
```

## Feature Flags (Operations Phase)

```tsx
import { useFlags } from 'launchdarkly-react-client-sdk';

function Checkout() {
  const { newCheckoutFlow } = useFlags();
  return newCheckoutFlow ? <NewCheckout /> : <LegacyCheckout />;
}
```

## Best Practices

- Use kebab-case for flag keys: `new-checkout-flow`
- Always provide defaults in code
- Pass user context for targeting
