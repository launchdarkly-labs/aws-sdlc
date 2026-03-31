# LaunchDarkly AI Configs - Construction Phase

**Insert after: Build and Test stage completes**

Now that you have Kiro CLI, let it set up LaunchDarkly for you.

---

## What You'll Build

By the end of this section:
1. Kiro CLI will create your LaunchDarkly project and AI Config
2. You can switch AI models instantly - no code deploy needed

---

## Step 1: Connect LaunchDarkly to Kiro CLI

### 1a. Set your API token

In your **bash terminal**, set your token as an environment variable:

```bash
export LAUNCHDARKLY_API_TOKEN="api-YOUR-TOKEN-HERE"
```

### 1b. Create the MCP config file

Now run this command (it uses the token you just set):

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

### 1c. Verify the file was created

```bash
cat .kiro/settings/mcp.json
```

You should see your actual token in the output (not the variable name).

### 1d. Restart Kiro CLI

Exit Kiro CLI and restart it:

```
/quit
```

```bash
kiro-cli
```

### 1e. Verify

In Kiro CLI, type:

```
/mcp list
```

You should see `launchdarkly` in the list.

---

## Step 2: Let Kiro Set Up Everything

Now ask Kiro CLI to do all the LaunchDarkly setup:

```
Set up LaunchDarkly for this workshop:

1. Create a project called "aidlc-workshop" (key: aidlc-workshop)
2. Create an AI Config called "aidlc-agent" in agent mode with:
   - A "sonnet" variation using model us.anthropic.claude-3-5-sonnet-20241022-v2:0
   - An "opus" variation using model us.anthropic.claude-opus-4-20250514-v1:0
   - Default targeting to serve "sonnet"
3. Get the SDK key for the Test environment
4. Store the SDK key in AWS SSM at /icode/launchdarkly/sdk-key as a SecureString
```

Kiro will use the LaunchDarkly MCP tools to create everything and confirm when done.

### 2b. Verify in LaunchDarkly

Check **https://app.launchdarkly.com**:
- Projects → aidlc-workshop
- AI configs → aidlc-agent (with sonnet and opus variations)

---

## Step 3: Add LaunchDarkly to the Agent Code

### 3a. Install the Python Packages

In your **bash terminal**:

```bash
cd /home/ec2-user/environment/code/agent
pip install launchdarkly-server-sdk launchdarkly-server-sdk-ai
```

### 3b. Update requirements.txt

Add to `code/agent/requirements.txt`:

```
launchdarkly-server-sdk
launchdarkly-server-sdk-ai
```

### 3c. Update common.py

Ask Kiro CLI to update the agent code:

```
Update code/agent/common.py to use LaunchDarkly AI Config:

1. Add imports for ldclient, Context, LDConfig, LDAIClient, AIAgentConfigDefault
2. Change DEFAULT_MODEL_ID to 'us.anthropic.claude-3-5-sonnet-20241022-v2:0'
3. Add a get_model_from_launchdarkly() function that:
   - Gets SDK key from AWS SSM at /icode/launchdarkly/sdk-key
   - Initializes the LaunchDarkly client
   - Gets the model from AI Config "aidlc-agent"
   - Falls back to DEFAULT_MODEL_ID if not configured
4. Set BEDROCK_MODEL_ID = get_model_from_launchdarkly()
```

Kiro will make the code changes for you.

---

## Step 4: Test It

### 4a. Run the Agent

```bash
cd /home/ec2-user/environment/code/agent
python aidlc_agent.py
```

### 4b. Check the Logs

Look for:
```
[LaunchDarkly] Using model from LaunchDarkly: us.anthropic.claude-3-5-sonnet-20241022-v2:0
```

---

## Step 5: Switch Models

### 5a. Change to Opus

Ask Kiro CLI:

```
Change the aidlc-agent AI Config default targeting to serve "opus" instead of "sonnet"
```

### 5b. Run the Agent Again

```bash
python aidlc_agent.py
```

Now you should see:
```
[LaunchDarkly] Using model from LaunchDarkly: us.anthropic.claude-opus-4-20250514-v1:0
```

**You switched AI models without changing any code!**

### 5c. Switch Back

```
Change aidlc-agent targeting back to serve "sonnet"
```

---

## How It Works

```
┌──────────────────┐
│  Your Code       │
│  (common.py)     │
└────────┬─────────┘
         │ "What model should I use?"
         ▼
┌──────────────────┐
│  LaunchDarkly    │
│  AI Config       │
│  aidlc-agent     │
└────────┬─────────┘
         │ "Use claude-3-5-sonnet..."
         ▼
┌──────────────────┐
│  AWS Bedrock     │
└──────────────────┘
```

---

## Next Steps

Continue to [Operations Phase LaunchDarkly](./operations-launchdarkly.md) to add feature flags.

---

## Troubleshooting

### MCP not connecting

Check your config file exists and has the right token:
```bash
cat .kiro/settings/mcp.json
```

Make sure:
- The token starts with `api-` (not `sdk-`)
- The JSON is valid (no trailing commas)
- You restarted `kiro-cli` after creating the file

### "SDK key not found"

Ask Kiro to check:
```
Check if the SDK key is stored in AWS SSM at /icode/launchdarkly/sdk-key
```

### Fallback: Manual Setup

If MCP doesn't work, see [Manual Setup Guide](./launchdarkly-manual-setup.md) to create configs via the LaunchDarkly UI.
