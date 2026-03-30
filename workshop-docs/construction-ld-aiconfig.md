# LaunchDarkly AI Configs for the Construction Phase

Add runtime model/prompt configuration to the AI-DLC agents without redeployment.

## How the iCode Agents Work

The workshop uses three agents in `code/agent/`:

| Agent | File | Purpose |
|-------|------|---------|
| Orchestrator | `orchestrator_agent.py` | Routes requests to specialists |
| AI-DLC | `aidlc_agent.py` | Structured development workflow |
| General | `general_agent.py` | General assistance |

Model configuration is in `common.py`:
```python
BEDROCK_MODEL_ID = os.environ.get('BEDROCK_MODEL_ID', 'global.anthropic.claude-opus-4-6-v1')
```

Prompts are loaded via `prompt_loader.py` from S3 or local files.

---

## Integration: Add LaunchDarkly to common.py

Replace the hardcoded model with AI Config lookup.

### Before (current code)
```python
# common.py
BEDROCK_MODEL_ID = os.environ.get('BEDROCK_MODEL_ID', 'global.anthropic.claude-opus-4-6-v1')
```

### After (with LaunchDarkly)
```python
# common.py
import ldclient
from ldclient import Context
from ldclient.config import Config
from ldai.client import LDAIClient
from ldai import AIAgentConfigDefault

# Initialize LaunchDarkly
LD_SDK_KEY = ssm_client.get_parameter(
    Name='/icode/launchdarkly/sdk-key',
    WithDecryption=True
)['Parameter']['Value']

ldclient.set_config(Config(LD_SDK_KEY))
ld_client = ldclient.get()
ai_client = LDAIClient(ld_client)

def get_model_config(user_id: str = 'default', project_id: str = 'default'):
    """Get model configuration from LaunchDarkly."""
    context = Context.builder(user_id).set("project_id", project_id).build()

    agent = ai_client.agent_config(
        "aidlc-agent",
        context,
        AIAgentConfigDefault(enabled=True)
    )

    if agent.enabled and agent.model:
        return agent.model.name, agent.instructions

    # Fallback
    return 'us.anthropic.claude-3-5-sonnet-20241022-v2:0', None

BEDROCK_MODEL_ID, CUSTOM_INSTRUCTIONS = get_model_config()
```

---

## Integration: Modify aidlc_agent.py

Pass LaunchDarkly instructions to the agent.

```python
# aidlc_agent.py
from common import AWS_REGION, BEDROCK_MODEL_ID, CUSTOM_INSTRUCTIONS, all_mcp_tools, BEDROCK_CLIENT_CONFIG
from prompt_loader import load_prompt

def create_aidlc_agent(session_id='', actor_id=''):
    # Use LD instructions if available, otherwise load from S3
    system_prompt = CUSTOM_INSTRUCTIONS or load_prompt("aidlc_v1.0.0")

    return Agent(
        model=BedrockModel(
            region_name=AWS_REGION,
            model_id=BEDROCK_MODEL_ID,  # Now from LaunchDarkly
            # ...
        ),
        system_prompt=system_prompt,  # Now from LaunchDarkly
        # ...
    )
```

---

## Setup in LaunchDarkly

### 1. Store SDK Key in SSM
```bash
aws ssm put-parameter \
  --name "/icode/launchdarkly/sdk-key" \
  --value "sdk-your-key-here" \
  --type SecureString
```

### 2. Create AI Config

In LaunchDarkly dashboard:
- **Key**: `aidlc-agent`
- **Provider**: bedrock

**Variations:**

| Name | Model | Use Case |
|------|-------|----------|
| Sonnet | `us.anthropic.claude-3-5-sonnet-20241022-v2:0` | Default |
| Opus | `us.anthropic.claude-opus-4-20250514-v1:0` | Complex projects |
| Haiku | `us.anthropic.claude-3-5-haiku-20241022-v1:0` | Fast/simple tasks |

### 3. Add Targeting Rules
- `project_id` contains "enterprise" → Opus
- Default → Sonnet

---

## Demo

1. Run a workflow with the current model
2. Change the AI Config in LaunchDarkly dashboard
3. Run again — different model, no redeploy

---

## Requirements

Add to `code/agent/requirements.txt`:
```
launchdarkly-server-sdk
launchdarkly-server-sdk-ai
```

---

## Next

Continue to [Operations Phase](./operations-ld-flags.md) to add feature flags to the fake web app.
