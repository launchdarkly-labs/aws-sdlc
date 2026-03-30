# LaunchDarkly AI Configs Integration

When working with LaunchDarkly AI Configs, follow the workflows from the LaunchDarkly Agent Skills repository.

## Reference

Agent Skills repo: https://github.com/launchdarkly/agent-skills

## Available Skills

### /aiconfig-create
Create AI Configs with model configuration and instructions.
- Choose agent mode (for multi-step workflows) or completion mode (for single responses)
- Two-step process: create config first, then create variations
- Always verify via API after creation

### /aiconfig-variations
Add or update variations in an AI Config.
- Each variation has: model, instructions/messages, parameters
- Use for A/B testing different models or prompts
- modelConfigKey format: `{Provider}.{model-id}` (e.g., `Bedrock.us.anthropic.claude-3-5-sonnet-20241022-v2:0`)

### /aiconfig-targeting
Configure targeting rules to control which users get which variation.
- Target by user attributes (plan, subscription_status, etc.)
- Set percentage rollouts for experiments
- Change the default variation

### /aiconfig-tools
Create and attach tools for function calling.
- Define tool schemas in LaunchDarkly
- Attach tools to AI Config variations
- Tools are created separately, then attached via PATCH

## API Token

Skills require a LaunchDarkly API access token with `ai-configs:write` permission.

Check for token in:
1. Environment variable: `LAUNCHDARKLY_ACCESS_TOKEN`
2. Prompt user if not found

## Workflow Pattern

1. Understand the use case (what framework, what capabilities needed)
2. Create the AI Config with `/aiconfig-create`
3. Add variations with `/aiconfig-variations`
4. Configure targeting with `/aiconfig-targeting`
5. Verify the config was created correctly
6. Integrate with application code using the LaunchDarkly AI SDK
