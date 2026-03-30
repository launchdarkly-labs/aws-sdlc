"""
LaunchDarkly AI Config Integration for AI-DLC Agents (AWS Bedrock)

This example shows how to add runtime model/prompt configuration
to an AI agent using LaunchDarkly AI Configs with AWS Bedrock.

For the AWS AI-DLC workshop, this pattern enables:
- Changing models without redeployment
- A/B testing different prompts
- Gradual rollout of prompt improvements
- Per-user or per-project model selection
"""

import os
import boto3
import ldclient
from ldclient import Context
from ldclient.config import Config
from ldai.client import LDAIClient
from ldai import AIAgentConfigDefault

# =============================================================================
# Configuration
# =============================================================================

# Retrieve LaunchDarkly SDK key from AWS Secrets Manager (recommended)
def get_ld_sdk_key():
    """Retrieve LaunchDarkly SDK key from AWS Secrets Manager."""
    secret_name = os.environ.get("LD_SDK_KEY_SECRET", "launchdarkly/sdk-key")

    # Fall back to environment variable for local development
    if os.environ.get("LAUNCHDARKLY_SDK_KEY"):
        return os.environ["LAUNCHDARKLY_SDK_KEY"]

    secrets = boto3.client("secretsmanager")
    response = secrets.get_secret_value(SecretId=secret_name)
    return response["SecretString"]


# Default configuration used when LD is unavailable
DEFAULT_CONFIG = AIAgentConfigDefault(
    enabled=False  # Disabled by default when LD unavailable
)

# AWS Region for Bedrock
AWS_REGION = os.environ.get("AWS_REGION", "us-west-2")


# =============================================================================
# Initialize LaunchDarkly
# =============================================================================

def init_launchdarkly():
    """Initialize LaunchDarkly clients for AI Config."""
    sdk_key = get_ld_sdk_key()
    ldclient.set_config(Config(sdk_key))
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
    ld_context = build_context(context_data)

    config = ai_client.agent_config(
        agent_key,
        ld_context,
        DEFAULT_CONFIG,
        context_data  # Optional variables for template interpolation
    )

    return config


# =============================================================================
# Bedrock Model Invocation
# =============================================================================

def invoke_bedrock(model_id: str, system_prompt: str, user_message: str) -> dict:
    """
    Invoke a model via AWS Bedrock Converse API.

    Args:
        model_id: Bedrock model ID (e.g., "anthropic.claude-3-sonnet-20240229-v1:0")
        system_prompt: System instructions for the model
        user_message: User's prompt

    Returns:
        Bedrock converse response
    """
    client = boto3.client("bedrock-runtime", region_name=AWS_REGION)

    response = client.converse(
        modelId=model_id,
        system=[{"text": system_prompt}],
        messages=[
            {
                "role": "user",
                "content": [{"text": user_message}]
            }
        ],
        inferenceConfig={
            "maxTokens": 4096,
            "temperature": 0.7,
        }
    )

    return response


def extract_response_text(response: dict) -> str:
    """Extract text content from Bedrock converse response."""
    output = response.get("output", {})
    message = output.get("message", {})
    content = message.get("content", [])

    texts = []
    for block in content:
        if "text" in block:
            texts.append(block["text"])

    return "\n".join(texts)


# =============================================================================
# Code Generation Agent
# =============================================================================

def generate_code(ai_client: LDAIClient, prompt: str, context_data: dict) -> str:
    """
    Generate code using LaunchDarkly-configured model and instructions via Bedrock.

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
    # Bedrock model IDs: anthropic.claude-3-sonnet-20240229-v1:0, anthropic.claude-3-opus-20240229-v1:0
    model_id = agent.model.name if agent.model else "anthropic.claude-3-sonnet-20240229-v1:0"
    instructions = agent.instructions or "You are a helpful code generation assistant."

    # Invoke Bedrock and track metrics
    response = agent.tracker.track_bedrock_converse_metrics(
        invoke_bedrock(model_id, instructions, prompt)
    )

    return extract_response_text(response)


# =============================================================================
# Example Usage
# =============================================================================

def main():
    """Example usage of AI Config integration with Bedrock."""

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
   - Provider: bedrock

2. Add variations:
   - Variation 1: Claude Sonnet (default)
     - Model: anthropic.claude-3-sonnet-20240229-v1:0
     - Instructions: [production prompt]

   - Variation 2: Claude Opus (premium)
     - Model: anthropic.claude-3-opus-20240229-v1:0
     - Instructions: [enhanced prompt for complex projects]

   - Variation 3: Claude Haiku (fast/cheap)
     - Model: anthropic.claude-3-haiku-20240307-v1:0
     - Instructions: [concise prompt for simple tasks]

3. Set up targeting:
   - Rule: If user.plan = "enterprise" → serve Opus variation
   - Rule: If project.complexity = "high" → serve Opus variation
   - Rule: If project.complexity = "low" → serve Haiku variation
   - Default: Sonnet variation

4. AWS Prerequisites:
   - Enable Claude models in Bedrock console (Model access)
   - IAM role/user needs bedrock:InvokeModel permission
   - Set AWS_REGION environment variable if not us-west-2

5. Demo:
   - Run the script, see Sonnet response
   - Change targeting in LaunchDarkly dashboard
   - Run again, see different model response (no redeploy!)

Bedrock Model IDs:
   - anthropic.claude-3-opus-20240229-v1:0
   - anthropic.claude-3-sonnet-20240229-v1:0
   - anthropic.claude-3-haiku-20240307-v1:0
   - anthropic.claude-instant-v1
   - amazon.titan-text-express-v1
   - meta.llama3-70b-instruct-v1:0
"""
