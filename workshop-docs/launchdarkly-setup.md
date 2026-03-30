# LaunchDarkly Setup Guide

This guide walks you through setting up LaunchDarkly for the AI-DLC workshop. Complete this **before** starting the Construction Phase.

---

## What is LaunchDarkly?

LaunchDarkly lets you change how your app works **without redeploying code**. In this workshop, you'll use it to:

- **AI Configs**: Switch between AI models (like Claude Sonnet vs Opus) instantly
- **Feature Flags**: Turn features on/off for different users

Think of it like a remote control for your application.

---

## Step 1: Create a LaunchDarkly Account

### 1a. Sign Up

1. Open your browser and go to: **https://launchdarkly.com/start-trial/**

2. Click **Start free trial**

3. Fill in the form:
   - **Email**: Your email address
   - **Password**: Create a password
   - Click **Create account**

4. Check your email and click the verification link

5. Complete the onboarding questions (you can skip these)

You now have a LaunchDarkly account with a 14-day free trial.

---

## Step 2: Get Your API Access Token

The API token lets your AI assistant (Claude Code, Cursor, Kiro) create configs and flags for you.

### 2a. Navigate to Authorization Settings

1. In LaunchDarkly, click your **profile icon** (bottom-left corner)

2. Click **Account settings**

3. In the left sidebar, click **Authorization**

### 2b. Create the Token

1. Click **+ Create token** (top-right)

2. Fill in:
   - **Name**: `workshop-token`
   - **Role**: Select **Writer** (important!)

3. Click **Create token**

4. **IMPORTANT**: Copy the token immediately - it starts with `api-` and you won't see it again!

5. Save it somewhere safe (a text file on your desktop is fine for now)

```
Example token format:
api-12345678-abcd-1234-efgh-123456789012
```

---

## Step 3: Get Your SDK Key

The SDK key lets your application code connect to LaunchDarkly at runtime.

### 3a. Find Your Project Settings

1. In LaunchDarkly, click **Projects** in the left sidebar

2. Click on **default** (or your project name)

3. Click the **Environments** tab

### 3b. Copy the SDK Key

1. Find the **Test** environment

2. Click the **copy icon** next to the SDK key

3. Save this key - it starts with `sdk-`

```
Example SDK key format:
sdk-12345678-abcd-1234-efgh-123456789012
```

You now have two keys:
- **API token** (`api-...`) - for your AI assistant
- **SDK key** (`sdk-...`) - for your application code

---

## Step 4: Install the LaunchDarkly MCP Server

MCP (Model Context Protocol) lets your AI assistant talk directly to LaunchDarkly.

### 4a. Find Your MCP Config File

The location depends on which AI tool you're using:

| Tool | Config File Location |
|------|---------------------|
| Claude Code | `~/.claude/config.json` |
| Cursor | `~/.cursor/mcp.json` |
| Kiro | Check Kiro settings |

### 4b. Add the LaunchDarkly Server

Open your config file and add this:

```json
{
  "mcpServers": {
    "launchdarkly": {
      "command": "npx",
      "args": [
        "-y",
        "@launchdarkly/mcp-server",
        "--access-token",
        "api-YOUR-TOKEN-HERE"
      ]
    }
  }
}
```

**Replace** `api-YOUR-TOKEN-HERE` with your actual API token from Step 2.

### 4c. Restart Your AI Tool

Close and reopen Claude Code, Cursor, or Kiro completely.

### 4d. Verify It Works

Ask your AI assistant:

```
List my LaunchDarkly projects
```

If it works, you'll see your project name. If not, double-check your API token.

---

## Step 5: Store Your SDK Key in AWS

Your application code needs the SDK key to connect to LaunchDarkly. We'll store it securely in AWS SSM Parameter Store.

### 5a. Open Your Terminal

In the workshop IDE, open a new terminal.

### 5b. Run This Command

```bash
aws ssm put-parameter \
  --name "/icode/launchdarkly/sdk-key" \
  --value "sdk-YOUR-SDK-KEY-HERE" \
  --type SecureString \
  --overwrite
```

**Replace** `sdk-YOUR-SDK-KEY-HERE` with your actual SDK key from Step 3.

### 5c. Verify It Worked

```bash
aws ssm get-parameter --name "/icode/launchdarkly/sdk-key" --with-decryption
```

You should see your SDK key in the output.

---

## You're Ready!

You now have:
- A LaunchDarkly account
- An API token (for your AI assistant)
- An SDK key (stored in AWS)
- MCP server installed

Continue to the next section to create your first AI Config.

---

## Troubleshooting

### "Command not found: npx"

Install Node.js first:
```bash
# On Mac
brew install node

# On Linux
sudo apt install nodejs npm
```

### "Invalid API token"

- Make sure your token starts with `api-` (not `sdk-`)
- Check you copied the full token
- Verify the token has **Writer** role (not Reader)

### "MCP server not connecting"

1. Check your config file syntax (valid JSON?)
2. Restart your AI tool completely
3. Try running the MCP server manually to see errors:
   ```bash
   npx -y @launchdarkly/mcp-server --access-token api-YOUR-TOKEN
   ```

### "SSM parameter error"

- Make sure you're logged into AWS: `aws sts get-caller-identity`
- Check you have permission to write to SSM
