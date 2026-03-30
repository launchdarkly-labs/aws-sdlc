---
name: LaunchDarkly AI-DLC Integration
version: 1.0.0
---

# LaunchDarkly for AI-DLC Workshop

## MCP Server Configuration

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

## Setup

1. Add the config above to your AI client (Claude Code, Cursor, etc.)
2. On first use, you'll be prompted to authenticate via OAuth
3. Verify by asking the agent to list your LaunchDarkly flags

Quick install links:
- https://mcp.launchdarkly.com/mcp/fm/install
- https://mcp.launchdarkly.com/mcp/aiconfigs/install
