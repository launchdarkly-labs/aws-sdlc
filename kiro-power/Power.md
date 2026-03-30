---
name: LaunchDarkly AI-DLC Integration
version: 1.0.0
---

# LaunchDarkly for AI-DLC Workshop

This Power provides LaunchDarkly integration capabilities for the AWS AI-Driven Development Lifecycle workshop.

## MCP Server Configuration

LaunchDarkly provides two hosted MCP servers. Add this configuration to your MCP settings:

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

| Server | URL | Purpose |
|--------|-----|---------|
| Feature management | `https://mcp.launchdarkly.com/mcp/fm` | Manage feature flags |
| AI Configs | `https://mcp.launchdarkly.com/mcp/aiconfigs` | Manage AI Configs and variations |

You can configure one or both servers depending on your needs.

## Setup Instructions

### 1. Get Your LaunchDarkly API Token

1. Log in to your LaunchDarkly account at https://app.launchdarkly.com
2. Navigate to **Account Settings** → **Authorization**
3. Click **Create token**
4. Give it a descriptive name (e.g., "AI-DLC Workshop MCP")
5. Select appropriate permissions:
   - For AI Configs: `reader` or `writer` role on AI Configs
   - For Feature Flags: `reader` or `writer` role on Flags
6. Copy the generated token

### 2. Configure the MCP Server

The hosted MCP servers use OAuth for authentication. When you first connect, you'll be prompted to authenticate with your LaunchDarkly account.

**Quick Configuration**: Visit these URLs to auto-configure your AI client:
- Feature management: https://mcp.launchdarkly.com/mcp/fm/install
- AI Configs: https://mcp.launchdarkly.com/mcp/aiconfigs/install

### 3. Verify Connection

Once configured, you can verify the connection by asking the agent to list your LaunchDarkly projects or flags.

## Capabilities

This integration provides:

- **AI Configs**: Manage runtime model and prompt configurations for AI agents
- **Feature Flags**: Create and manage feature flags for progressive delivery
- **Targeting Rules**: Configure who sees what variations
- **Experimentation**: Set up A/B tests and analyze results

## Workshop Use Cases

### Construction Phase
- Configure AI Configs for code generation agents
- Change models and prompts without redeploying

### Operations Phase
- Add feature flags to the AnyCompanyRead application
- Implement progressive rollouts for new features
- A/B test checkout flows and UI components
