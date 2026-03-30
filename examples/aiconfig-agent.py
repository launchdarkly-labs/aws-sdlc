"""
LaunchDarkly AI Config Integration for AI-DLC Agents

This example shows how to add runtime model/prompt configuration
to an AI agent using LaunchDarkly AI Configs.

For the AWS AI-DLC workshop, this pattern enables:
- Changing models without redeployment
- A/B testing different prompts
- Gradual rollout of prompt improvements
- Per-user or per-project model selection
"""

import os
import anthropic
import ldclient
from ldclient import Context
from ldclient.config import Config
from ldai.client import LDAIClient
from ldai import AIAgentConfigDefault

# =============================================================================
# Configuration
# =============================================================================

# In production, retrieve from AWS Secrets Manager:
# import boto3
# secrets = boto3.client('secretsmanager')
# SDK_KEY = secrets.get_secret_value(SecretId='launchdarkly/sdk-key')['SecretString']

SDK_KEY = os.environ.get("LAUNCHDARKLY_SDK_KEY", "your-sdk-key-here")

# Default configuration used when LD is unavailable
DEFAULT_CONFIG = AIAgentConfigDefault(
    enabled=False  # Disabled by default when LD unavailable
)


# =============================================================================
# Initialize LaunchDarkly
# =============================================================================

def init_launchdarkly():
    """Initialize LaunchDarkly clients for AI Config."""
    ldclient.set_config(Config(SDK_KEY))
    ld_client = ldclient.get()
    ai_client = LDAIClient(ld_client)
    return ld_client, ai_client


# =============================================================================
# Build LaunchDarkly Context
# =============================================================================

def build_context(context_data: dict) -> Context:
    """
    Build a LaunchDarkly context from user/project info.

    Args:
        context_data: Dictionary with user and project information

    Returns:
        LaunchDarkly Context object for targeting
    """
    return Context.builder(context_data.get("user_id", "anonymous")) \
        .set("email", context_data.get("email")) \
        .set("plan", context_data.get("plan", "free")) \
        .set("project_id", context_data.get("project_id", "default")) \
        .set("complexity", context_data.get("complexity", "standard")) \
        .build()


# =============================================================================
# Get Agent Configuration
# =============================================================================

def get_agent_config(ai_client: LDAIClient, agent_key: str, context_data: dict):
    """
    Retrieve AI configuration for a specific agent.

    Args:
        ai_client: The LaunchDarkly AI client
        agent_key: The AI Config key in LaunchDarkly (e.g., "code-gen-agent")
        context_data: User/project context for targeting

    Returns:
        AIAgentConfig with model, instructions, and tracker
    """
    # Build LaunchDarkly context
    ld_context = build_context(context_data)

    # Get config from LaunchDarkly with fallback to default
    config = ai_client.agent_config(
        agent_key,
        ld_context,
        DEFAULT_CONFIG,
        context_data  # Optional variables for template interpolation
    )

    return config


# =============================================================================
# Code Generation Agent
# =============================================================================

def generate_code(ai_client: LDAIClient, prompt: str, context_data: dict) -> str:
    """
    Generate code using LaunchDarkly-configured model and instructions.

    Args:
        ai_client: The LaunchDarkly AI client
        prompt: The user's code generation request
        context_data: User/project context for targeting

    Returns:
        Generated code as a string
    """
    # Get runtime configuration from LaunchDarkly
    agent = get_agent_config(ai_client, "code-gen-agent", context_data)

    # Check if code generation is enabled for this context
    if not agent.enabled:
        return "Code generation is currently disabled for your account."

    # Get model and instructions from the agent config
    model_name = agent.model.name if agent.model else "claude-sonnet-4-20250514"
    instructions = agent.instructions or "You are a helpful code generation assistant."

    # Initialize the appropriate model client based on config
    if "claude" in model_name.lower():
        client = anthropic.Anthropic()
        response = client.messages.create(
            model=model_name,
            max_tokens=4096,
            system=instructions,
            messages=[{"role": "user", "content": prompt}]
        )

        # Track success with the agent's tracker
        agent.tracker.track_success()

        return response.content[0].text

    # Add other model providers as needed (OpenAI, etc.)
    raise ValueError(f"Unsupported model: {model_name}")


# =============================================================================
# Example Usage
# =============================================================================

def main():
    """Example usage of AI Config integration."""

    # Initialize LaunchDarkly
    ld_client, ai_client = init_launchdarkly()

    try:
        # Simulate user context (in real app, comes from auth/session)
        context = {
            "user_id": "user-123",
            "email": "developer@example.com",
            "plan": "pro",
            "project_id": "anycompanyread",
            "complexity": "standard",
        }

        # Generate code with LD-configured model and instructions
        prompt = """Create a Python function that validates an email address.
Include proper error handling and return a boolean."""

        result = generate_code(ai_client, prompt, context)
        print("Generated Code:")
        print("-" * 40)
        print(result)

    finally:
        # Clean up LaunchDarkly client
        ld_client.close()


if __name__ == "__main__":
    main()


# =============================================================================
# Workshop Notes
# =============================================================================
"""
Setting up in LaunchDarkly Dashboard:

1. Create a new AI Config:
   - Key: code-gen-agent
   - Name: Code Generation Agent

2. Add variations:
   - Variation 1: Claude Sonnet (default)
     - Model: claude-sonnet-4-20250514
     - Instructions: [production prompt]

   - Variation 2: Claude Opus (premium)
     - Model: claude-opus-4-20250514
     - Instructions: [enhanced prompt for complex projects]

3. Set up targeting:
   - Rule: If user.plan = "enterprise" → serve Opus variation
   - Rule: If project.complexity = "high" → serve Opus variation
   - Default: Sonnet variation

4. Demo:
   - Run the script, see Sonnet response
   - Change targeting in dashboard
   - Run again, see Opus response (no redeploy!)
"""
