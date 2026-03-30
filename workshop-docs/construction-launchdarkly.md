# LaunchDarkly AI Configs - Construction Phase

**Insert after: Build and Test stage completes**

This tutorial adds LaunchDarkly AI Configs to the iCode agent, letting you switch AI models without redeploying.

---

## What You'll Build

By the end of this section, you can:
1. Change which AI model the iCode agent uses using Agent Skills
2. See the model switch happen instantly - no code deploy needed

---

## Step 1: Create the AI Config

Use the `/aiconfig-create` skill to create your AI Config.

### 1a. Create the Config

In Kiro, type:

```
/aiconfig-create

Create an AI Config called "aidlc-agent" in agent mode.
Use Claude 3.5 Sonnet (us.anthropic.claude-3-5-sonnet-20241022-v2:0) as the model.
Add instructions: "You are an AI development assistant."
```

Kiro will:
- Create the AI Config
- Create a "sonnet" variation with the model
- Verify the config was created
- Provide a link to view it in LaunchDarkly

### 1b. Add a Second Variation

```
/aiconfig-variations

Add a variation called "opus" to aidlc-agent
using Claude Opus 4 (us.anthropic.claude-opus-4-20250514-v1:0)
```

### 1c. Verify

Kiro will confirm both variations exist. You can also check at:
**https://app.launchdarkly.com** → AI configs → aidlc-agent

---

## Step 2: Add LaunchDarkly to the Agent Code

### 2a. Install the Python Packages

Open a terminal and run:

```bash
cd /home/participant/environment/code/agent
pip install launchdarkly-server-sdk launchdarkly-server-sdk-ai
```

### 2b. Update requirements.txt

Open `code/agent/requirements.txt` and add these lines at the end:

```
launchdarkly-server-sdk
launchdarkly-server-sdk-ai
```

### 2c. Update common.py

Open `code/agent/common.py`.

**Find this section (near the top):**

```python
import os
import requests
import boto3
from botocore.config import Config

# Get environment variables
AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')
BEDROCK_MODEL_ID = os.environ.get('BEDROCK_MODEL_ID', 'global.anthropic.claude-opus-4-6-v1')
```

**Replace it with:**

```python
import os
import requests
import boto3
from botocore.config import Config

# LaunchDarkly imports
import ldclient
from ldclient import Context
from ldclient.config import Config as LDConfig
from ldai.client import LDAIClient
from ldai import AIAgentConfigDefault

# Get environment variables
AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')
DEFAULT_MODEL_ID = 'us.anthropic.claude-3-5-sonnet-20241022-v2:0'
```

### 2d. Add the LaunchDarkly Function

**Find this line:**

```python
ssm_client = boto3.client('ssm', region_name=AWS_REGION)
```

**Add this code right after it:**

```python
# ==============================================
# LaunchDarkly AI Config Integration
# ==============================================

def get_model_from_launchdarkly():
    """
    Get the AI model from LaunchDarkly AI Config.
    Falls back to DEFAULT_MODEL_ID if LaunchDarkly is not configured.
    """
    try:
        # Get SDK key from AWS SSM Parameter Store
        sdk_key = ssm_client.get_parameter(
            Name='/icode/launchdarkly/sdk-key',
            WithDecryption=True
        )['Parameter']['Value']

        print(f"[LaunchDarkly] Connecting to LaunchDarkly...", flush=True)

        # Initialize LaunchDarkly client
        ldclient.set_config(LDConfig(sdk_key))
        ld_client = ldclient.get()
        ai_client = LDAIClient(ld_client)

        # Create a context (who is making the request)
        context = Context.builder("icode-workshop").build()

        # Get the AI Config
        agent_config = ai_client.agent_config(
            "aidlc-agent",  # Must match the key you created in LaunchDarkly
            context,
            AIAgentConfigDefault(enabled=True)
        )

        # Check if we got a valid config
        if agent_config.enabled and agent_config.model:
            model_name = agent_config.model.name
            print(f"[LaunchDarkly] Using model from LaunchDarkly: {model_name}", flush=True)
            return model_name
        else:
            print(f"[LaunchDarkly] Config disabled or no model set", flush=True)

    except Exception as e:
        print(f"[LaunchDarkly] Not configured, using default: {e}", flush=True)

    # Fall back to default if LaunchDarkly isn't set up
    print(f"[LaunchDarkly] Using default model: {DEFAULT_MODEL_ID}", flush=True)
    return DEFAULT_MODEL_ID

# Get the model to use (from LaunchDarkly or default)
BEDROCK_MODEL_ID = get_model_from_launchdarkly()
```

---

## Step 3: Test It

### 3a. Run the Agent

In your terminal:

```bash
cd /home/participant/environment/code/agent
python aidlc_agent.py
```

### 3b. Check the Logs

Look for this line in the output:

```
[LaunchDarkly] Using model from LaunchDarkly: us.anthropic.claude-3-5-sonnet-20241022-v2:0
```

This means LaunchDarkly is working!

---

## Step 4: Switch Models (The Fun Part!)

Use the `/aiconfig-targeting` skill to change which model is served.

### 4a. Change to Opus

In Kiro, type:

```
/aiconfig-targeting

Change the default rule for aidlc-agent to serve "opus"
```

Kiro will update the targeting and confirm the change.

### 4b. Run the Agent Again

```bash
python aidlc_agent.py
```

Now you should see:

```
[LaunchDarkly] Using model from LaunchDarkly: us.anthropic.claude-opus-4-20250514-v1:0
```

**You just switched AI models without changing any code!**

### 4c. Switch Back to Sonnet

```
/aiconfig-targeting

Change the default rule for aidlc-agent to serve "sonnet"
```

No dashboard clicking required.

---

## Step 5: Try Different Scenarios

### Scenario A: A/B Test Models

Use `/aiconfig-targeting` to split traffic:

```
/aiconfig-targeting

Update aidlc-agent targeting:
Set the default rule to a 50/50 rollout between "sonnet" and "opus"
```

Now half your requests use Sonnet, half use Opus!

### Scenario B: Use Opus for Complex Tasks

```
/aiconfig-targeting

Update aidlc-agent targeting:
Add a rule that serves "opus" when context key contains "complex"
Keep the default rule serving "sonnet"
```

Now you can send different contexts from your code to get different models:

```python
# Simple task - gets Sonnet
context = Context.builder("simple-task").build()

# Complex task - gets Opus
context = Context.builder("complex-analysis").build()
```

---

## How It Works

```
┌──────────────────┐
│  Your Code       │
│  (common.py)     │
└────────┬─────────┘
         │
         │ "What model should I use?"
         ▼
┌──────────────────┐
│  LaunchDarkly    │
│  AI Config       │
│                  │
│  aidlc-agent:    │
│  - sonnet (50%)  │
│  - opus (50%)    │
└────────┬─────────┘
         │
         │ "Use us.anthropic.claude-3-5-sonnet..."
         ▼
┌──────────────────┐
│  AWS Bedrock     │
│  (runs the AI)   │
└──────────────────┘
```

---

## What You Learned

- AI Configs let you change models without redeploying
- The SDK key connects your code to LaunchDarkly
- Variations are different configurations you can switch between
- Targeting rules control who gets which variation

---

## Next Steps

Continue to [Operations Phase LaunchDarkly](./operations-launchdarkly.md) to add feature flags to the retail store app.

---

## Troubleshooting

### "SDK key not found"

Check the key is stored in SSM:
```bash
aws ssm get-parameter --name "/icode/launchdarkly/sdk-key" --with-decryption
```

If it's not there, go back to the Setup Guide and store it.

### "Config disabled or no model set"

Use skills to check and fix:

```
/aiconfig-targeting

Check the targeting for aidlc-agent.
Make sure it's enabled and the default rule serves a variation.
```

Or manually check: LaunchDarkly → AI configs → aidlc-agent → Targeting tab

### "Using default model" (LaunchDarkly not working)

- Check your SDK key starts with `sdk-` (not `api-`)
- Make sure the AI Config key is exactly `aidlc-agent`
- Verify you're in the right LaunchDarkly project

### Skills not working

Make sure your API token is set:
```bash
export LAUNCHDARKLY_ACCESS_TOKEN="api-your-token"
```

Check that Kiro can see the steering file at `.kiro/steering/launchdarkly-ai-configs.md`

### Import errors

Make sure you installed the packages:
```bash
pip install launchdarkly-server-sdk launchdarkly-server-sdk-ai
```
