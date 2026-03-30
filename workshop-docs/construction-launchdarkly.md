# LaunchDarkly AI Configs - Construction Phase

**Insert after: Build and Test stage completes**

This tutorial adds LaunchDarkly AI Configs to the iCode agent, letting you switch AI models without redeploying.

---

## What You'll Build

By the end of this section, you can:
1. Change which AI model the iCode agent uses from a web dashboard
2. See the model switch happen instantly - no code deploy needed

---

## Step 1: Create the AI Config

### 1a. Ask Your AI Assistant

In Claude Code, Cursor, or Kiro, type:

```
Create a LaunchDarkly AI Config with these settings:
- Key: aidlc-agent
- Name: AI-DLC Agent
- Mode: agent

Add two variations:
1. Key: sonnet
   Name: Claude Sonnet (Fast)
   Model: us.anthropic.claude-3-5-sonnet-20241022-v2:0

2. Key: opus
   Name: Claude Opus (Powerful)
   Model: us.anthropic.claude-opus-4-20250514-v1:0

Set sonnet as the default.
```

### 1b. Verify in LaunchDarkly Dashboard

1. Go to **https://app.launchdarkly.com**
2. Click **AI configs** in the left sidebar
3. You should see **aidlc-agent** in the list
4. Click on it to see your two variations

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

### 4a. Open LaunchDarkly Dashboard

1. Go to **https://app.launchdarkly.com**
2. Click **AI configs** → **aidlc-agent**

### 4b. Change the Default Variation

1. Click the **Targeting** tab
2. Find **Default rule**
3. Click the dropdown (currently shows "sonnet")
4. Select **opus**
5. Click **Review and save**
6. Click **Save changes**

### 4c. Run the Agent Again

```bash
python aidlc_agent.py
```

Now you should see:

```
[LaunchDarkly] Using model from LaunchDarkly: us.anthropic.claude-opus-4-20250514-v1:0
```

**You just switched AI models without changing any code!**

---

## Step 5: Try Different Scenarios

### Scenario A: A/B Test Models

1. In LaunchDarkly, go to **Targeting** tab
2. Under **Default rule**, click **Add rollout**
3. Set:
   - sonnet: 50%
   - opus: 50%
4. Save changes

Now half your requests use Sonnet, half use Opus!

### Scenario B: Use Opus for Complex Tasks

1. In LaunchDarkly, click **+ Add rule**
2. Configure:
   - **If** context **key** contains `complex`
   - **Serve** opus
3. Save changes

Now you can send different contexts from your code to get different models.

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

1. Go to LaunchDarkly → AI configs → aidlc-agent
2. Click **Targeting** tab
3. Make sure the toggle at the top is **ON**
4. Make sure Default rule serves a variation (not "off")

### "Using default model" (LaunchDarkly not working)

- Check your SDK key starts with `sdk-` (not `api-`)
- Make sure the AI Config key is exactly `aidlc-agent`
- Verify you're in the right LaunchDarkly project

### Import errors

Make sure you installed the packages:
```bash
pip install launchdarkly-server-sdk launchdarkly-server-sdk-ai
```
