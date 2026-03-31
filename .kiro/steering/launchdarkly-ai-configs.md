# LaunchDarkly AI Configs Integration

When the LaunchDarkly MCP server is connected, you can manage AI Configs and feature flags directly.

## Connecting MCP

Set your token and create the config file:

```bash
export LAUNCHDARKLY_API_TOKEN="api-YOUR-TOKEN-HERE"
```

```bash
mkdir -p .kiro/settings
```

```bash
cat > .kiro/settings/mcp.json << EOF
{
  "mcpServers": {
    "launchdarkly": {
      "command": "npx",
      "args": ["-y", "@launchdarkly/mcp-server", "--access-token", "$LAUNCHDARKLY_API_TOKEN"]
    }
  }
}
EOF
```

Then restart kiro-cli (`/quit` then `kiro-cli`).

## Available Capabilities

Once connected, you can:

### Projects
- Create new LaunchDarkly projects
- List existing projects
- Get project details and SDK keys

### AI Configs
- Create AI Configs in agent or completion mode
- Add variations with different models and instructions
- Configure targeting rules (who gets which variation)
- Set up percentage rollouts for A/B testing

### Feature Flags
- Create boolean or multivariate flags
- Configure targeting rules
- Toggle flags on/off

## Common Workflows

### Set Up AI Config for Model Switching

```
Create an AI Config called "aidlc-agent" in agent mode with:
- A "sonnet" variation using model us.anthropic.claude-3-5-sonnet-20241022-v2:0
- An "opus" variation using model us.anthropic.claude-opus-4-20250514-v1:0
- Default targeting to serve "sonnet"
```

### Switch Models

```
Change the aidlc-agent AI Config targeting to serve "opus"
```

### A/B Test Models

```
Update aidlc-agent targeting to a 50/50 rollout between "sonnet" and "opus"
```

### Store SDK Key in AWS

```
Get the SDK key for the Test environment and store it in AWS SSM at /icode/launchdarkly/sdk-key
```

## Model IDs for AWS Bedrock

| Model | Bedrock Model ID |
|-------|------------------|
| Claude 3.5 Sonnet | `us.anthropic.claude-3-5-sonnet-20241022-v2:0` |
| Claude Opus 4 | `us.anthropic.claude-opus-4-20250514-v1:0` |
| Claude Sonnet 4 | `us.anthropic.claude-sonnet-4-20250514-v1:0` |
