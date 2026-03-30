"""
LaunchDarkly AI Config + AWS Bedrock Example

Bedrock requires inference profile format: us.anthropic.claude-3-5-sonnet-20241022-v2:0
"""

import os
import boto3
import ldclient
from ldclient import Context
from ldclient.config import Config
from ldai.client import LDAIClient
from ldai import AIAgentConfigDefault

AWS_REGION = os.environ.get("AWS_REGION", "us-west-2")
DEFAULT_MODEL = "us.anthropic.claude-3-5-sonnet-20241022-v2:0"


def get_sdk_key():
    """Get SDK key from env or Secrets Manager."""
    if os.environ.get("LAUNCHDARKLY_SDK_KEY"):
        return os.environ["LAUNCHDARKLY_SDK_KEY"]

    secrets = boto3.client("secretsmanager")
    return secrets.get_secret_value(SecretId="launchdarkly/sdk-key")["SecretString"]


def generate_code(prompt: str, user_context: dict) -> str:
    """Generate code using LaunchDarkly-configured model via Bedrock."""

    # Initialize LaunchDarkly
    ldclient.set_config(Config(get_sdk_key()))
    ai_client = LDAIClient(ldclient.get())

    # Build context for targeting
    context = Context.builder(user_context.get("user_id", "anonymous")) \
        .set("plan", user_context.get("plan", "free")) \
        .set("complexity", user_context.get("complexity", "standard")) \
        .build()

    # Get AI Config
    agent = ai_client.agent_config(
        "code-gen-agent",
        context,
        AIAgentConfigDefault(enabled=False),
        user_context
    )

    if not agent.enabled:
        return "Code generation disabled."

    model_id = agent.model.name if agent.model else DEFAULT_MODEL
    instructions = agent.instructions or "You are a code generation assistant."

    # Call Bedrock
    bedrock = boto3.client("bedrock-runtime", region_name=AWS_REGION)
    response = agent.tracker.track_bedrock_converse_metrics(
        bedrock.converse(
            modelId=model_id,
            system=[{"text": instructions}],
            messages=[{"role": "user", "content": [{"text": prompt}]}],
            inferenceConfig={"maxTokens": 4096}
        )
    )

    return response["output"]["message"]["content"][0]["text"]


if __name__ == "__main__":
    result = generate_code(
        "Create a Python function that validates an email address.",
        {"user_id": "demo", "plan": "pro", "complexity": "standard"}
    )
    print(result)
