# LaunchDarkly AI Configs for the Construction Phase

This guide extends the AWS AI-DLC workshop Construction phase with LaunchDarkly AI Configs, enabling runtime model and prompt configuration for AI agents without redeployment.

## Overview

### Why AI Configs for Agent Orchestration?

In the AI-DLC workshop, AI agents generate code, analyze requirements, and perform various tasks. By default, these agents use hardcoded model configurations. With LaunchDarkly AI Configs, you can:

- **Switch models instantly** - Change from Claude Sonnet to Opus without redeploying
- **A/B test prompts** - Compare different system instructions to find optimal results
- **Target by context** - Use different models for different project complexities
- **Gradual rollout** - Safely introduce new prompts to a subset of users first

### What You'll Build

1. Store the LaunchDarkly SDK key securely in AWS Secrets Manager
2. Add AI Config integration to the code generation agent
3. Create an AI Config in LaunchDarkly with multiple variations
4. Demo changing the model in the dashboard and seeing the effect immediately

---

## Prerequisites

- Completed the AI-DLC workshop through the "Build and Test" section
- A LaunchDarkly account (free trial available at launchdarkly.com)
- AWS CLI configured with appropriate permissions

---

## Step 1: Store SDK Key in AWS Secrets Manager

Never hardcode API keys. Store your LaunchDarkly SDK key securely:

```bash
# Create the secret
aws secretsmanager create-secret \
  --name launchdarkly/sdk-key \
  --description "LaunchDarkly SDK key for AI-DLC workshop" \
  --secret-string "sdk-your-key-here"
```

Retrieve it in your code:

```python
import boto3
import json

def get_ld_sdk_key():
    """Retrieve LaunchDarkly SDK key from AWS Secrets Manager."""
    client = boto3.client('secretsmanager')
    response = client.get_secret_value(SecretId='launchdarkly/sdk-key')
    return response['SecretString']
```

---

## Step 2: Add AI Config to the Code Generation Agent

### Install Dependencies

```bash
pip install launchdarkly-server-sdk launchdarkly-server-sdk-ai
```

### Integrate with Your Agent

Modify your code generation agent to use AI Configs:

```python
import ldclient
from ldclient import Context
from ldclient.config import Config
from ldai.client import LDAIClient
from ldai import AIAgentConfigDefault
import anthropic

# Default configuration (used when LD is unavailable)
DEFAULT_CONFIG = AIAgentConfigDefault(enabled=False)

class CodeGenerationAgent:
    def __init__(self):
        # Initialize LaunchDarkly
        sdk_key = get_ld_sdk_key()
        ldclient.set_config(Config(sdk_key))
        self.ld_client = ldclient.get()
        self.ai_client = LDAIClient(self.ld_client)

        # Initialize Anthropic client
        self.anthropic = anthropic.Anthropic()

    def generate(self, prompt: str, context_data: dict) -> str:
        """Generate code using LD-configured model and instructions."""

        # Build LaunchDarkly context for targeting
        ld_context = Context.builder(context_data.get("user_id", "anonymous")) \
            .set("plan", context_data.get("plan", "free")) \
            .set("project_id", context_data.get("project_id", "default")) \
            .set("complexity", context_data.get("complexity", "standard")) \
            .build()

        # Get configuration from LaunchDarkly
        agent = self.ai_client.agent_config(
            "code-gen-agent",  # AI Config key
            ld_context,
            DEFAULT_CONFIG,
            context_data  # Variables for template interpolation
        )

        # Check if enabled
        if not agent.enabled:
            return "Code generation is currently disabled."

        # Get model and instructions from the agent config
        model_name = agent.model.name if agent.model else "claude-sonnet-4-20250514"

        # Generate using configured model and instructions
        response = self.anthropic.messages.create(
            model=model_name,
            max_tokens=4096,
            system=agent.instructions,
            messages=[{"role": "user", "content": prompt}]
        )

        # Track success
        agent.tracker.track_success()

        return response.content[0].text

    def close(self):
        self.ld_client.close()
```

---

## Step 3: Create the AI Config in LaunchDarkly

### Via the Dashboard

1. Navigate to **AI Configs** in your LaunchDarkly project
2. Click **Create AI Config**
3. Configure:
   - **Key**: `code-gen-agent`
   - **Name**: Code Generation Agent

4. Add variations:

**Variation 1: Standard (Default)**
```yaml
Model: claude-sonnet-4-20250514
Instructions: |
  You are a code generation assistant for the AI-DLC workshop.
  Generate clean, well-documented code following best practices.
  Include error handling and type hints where appropriate.
  Keep responses focused and concise.
```

**Variation 2: Premium**
```yaml
Model: claude-opus-4-20250514
Instructions: |
  You are an expert code generation assistant for the AI-DLC workshop.
  Generate production-ready code with comprehensive error handling.
  Include detailed documentation, type hints, and unit test suggestions.
  Consider edge cases and performance implications.
  Provide architectural guidance when relevant.
```

5. Set up targeting rules:
   - **Rule 1**: If `user.plan` = `enterprise` → serve Premium
   - **Rule 2**: If `project.complexity` = `high` → serve Premium
   - **Default**: serve Standard

### Via MCP (with Kiro)

If you have the LaunchDarkly MCP server configured, you can ask your AI assistant:

> "Create an AI Config called 'code-gen-agent' with two variations:
> Standard using Claude Sonnet, and Premium using Claude Opus with
> enhanced instructions. Target Premium to enterprise users."

---

## Step 4: Demo the Integration

### Initial Test

Run your agent and observe the output:

```python
agent = CodeGenerationAgent()

result = agent.generate(
    prompt="Create a function to validate email addresses",
    context_data={
        "user_id": "demo-user",
        "plan": "free",
        "project_id": "anycompanyread",
        "complexity": "standard"
    }
)

print(result)
```

You should see a response generated by Claude Sonnet with standard instructions.

### Change Configuration Without Redeploying

1. Go to the LaunchDarkly dashboard
2. Navigate to your `code-gen-agent` AI Config
3. Either:
   - Change the default variation to Premium, or
   - Add a targeting rule for your test user

4. Run the same code again - **no code changes, no redeploy**

```python
# Same code as before
result = agent.generate(
    prompt="Create a function to validate email addresses",
    context_data={
        "user_id": "demo-user",
        "plan": "free",  # Same context
        "project_id": "anycompanyread",
        "complexity": "standard"
    }
)

print(result)
```

You should now see a response from Claude Opus with the enhanced instructions!

---

## Advanced: A/B Testing Prompts

You can experiment with different prompts to optimize code quality:

1. Create multiple variations with different instructions
2. Set up a percentage rollout (e.g., 50/50 split)
3. Track metrics:
   - Code compilation success rate
   - User satisfaction ratings
   - Time to task completion

```python
# Track custom events for experimentation
ld_client.track("code-generation-completed", ld_context, {
    "success": True,
    "lines_of_code": 42,
    "user_rating": 5
})
```

View results in the LaunchDarkly Experimentation dashboard.

---

## Troubleshooting

### Config Not Updating

- Ensure the SDK key is correct (server-side SDK key, not client-side)
- Check that the AI Config key matches exactly (`code-gen-agent`)
- Verify targeting rules are configured correctly
- The SDK caches configs; changes propagate within seconds

### Connection Issues

```python
# Check if client is initialized
if ld_client.is_initialized():
    print("LaunchDarkly connected!")
else:
    print("Using default configuration")
```

### Missing Dependencies

```bash
pip install launchdarkly-server-sdk launchdarkly-server-sdk-ai boto3 anthropic
```

---

## Summary

You've now added LaunchDarkly AI Configs to the AI-DLC Construction phase:

✅ SDK key stored securely in AWS Secrets Manager
✅ Code generation agent integrated with AI Configs
✅ Multiple model/prompt variations configured
✅ Runtime changes without redeployment

**Next**: Continue to the [Operations Phase](./operations-ld-flags.md) to add feature flags to the AnyCompanyRead application.
