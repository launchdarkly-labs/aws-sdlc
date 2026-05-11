"""
LaunchDarkly AI Config + AWS Bedrock (Python) — minimal example.

Use this pattern when the workshop's generated app, or your own Strands /
Bedrock AgentCore agent, is written in Python instead of TypeScript.

SDKs:
    launchdarkly-server-sdk        >= 9.15.1
    launchdarkly-server-sdk-ai     >= 0.19.0
    boto3                          >= 1.40.x

Bedrock requires cross-region inference profile model IDs like
    us.anthropic.claude-3-5-sonnet-20241022-v2:0
"""

from __future__ import annotations

import os

import boto3
import ldclient
from ldclient import Context
from ldclient.config import Config
from ldai.client import AICompletionConfigDefault, LDAIClient

AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")
AI_CONFIG_KEY = "book-recommendations"
SDK_KEY_SSM_PARAM = "/anycompanyread/launchdarkly/sdk-key"
DEFAULT_MODEL = "us.anthropic.claude-3-5-sonnet-20241022-v2:0"
DEFAULT_INSTRUCTIONS = (
    "You are a book recommendation assistant. Suggest books based on the user's reading history."
)


def _resolve_sdk_key() -> str:
    """Prefer env var, fall back to AWS SSM SecureString."""
    sdk_key = os.environ.get("LAUNCHDARKLY_SDK_KEY")
    if sdk_key:
        return sdk_key
    ssm = boto3.client("ssm", region_name=AWS_REGION)
    return ssm.get_parameter(Name=SDK_KEY_SSM_PARAM, WithDecryption=True)["Parameter"]["Value"]


def _init_clients() -> tuple[LDAIClient, "boto3.client"]:
    ldclient.set_config(Config(_resolve_sdk_key()))
    ai_client = LDAIClient(ldclient.get())
    bedrock = boto3.client("bedrock-runtime", region_name=AWS_REGION)
    return ai_client, bedrock


def recommend_books(user_id: str, order_history: list[str], catalog: list[dict]) -> str:
    """Generate book recommendations through a LaunchDarkly-configured Bedrock model."""
    ai_client, bedrock = _init_clients()

    context = Context.builder(user_id).kind("user").build()

    fallback = AICompletionConfigDefault(
        enabled=True,
        model={"name": DEFAULT_MODEL, "parameters": {"temperature": 0.5, "maxTokens": 1024}},
        messages=[{"role": "system", "content": DEFAULT_INSTRUCTIONS}],
    )

    config = ai_client.completion_config(AI_CONFIG_KEY, context, fallback)

    if not config.enabled:
        return "Recommendations are disabled for this user."

    model_id = config.model.name if config.model else DEFAULT_MODEL
    instructions = (
        config.messages[0]["content"]
        if config.messages
        else DEFAULT_INSTRUCTIONS
    )
    max_recs = (config.model.custom or {}).get("maxRecommendations", 3) if config.model else 3
    temperature = (config.model.parameters or {}).get("temperature", 0.5) if config.model else 0.5
    max_tokens = (config.model.parameters or {}).get("maxTokens", 1024) if config.model else 1024

    catalog_lines = "\n".join(
        f"- \"{b['title']}\" by {b['author']} ({b.get('genre', 'General')}) [ID: {b['bookId']}]"
        for b in catalog
    )
    user_prompt = (
        f"User's previously purchased books: {', '.join(order_history) or 'None yet'}\n\n"
        f"Available catalog:\n{catalog_lines}\n\n"
        f"Recommend exactly {max_recs} books. Respond ONLY with JSON: "
        '{"recommendations":[{"bookId":"id","title":"Title","author":"Author","reason":"Why"}]}'
    )

    response = config.tracker.track_bedrock_converse_metrics(
        bedrock.converse(
            modelId=model_id,
            system=[{"text": instructions}],
            messages=[{"role": "user", "content": [{"text": user_prompt}]}],
            inferenceConfig={"temperature": temperature, "maxTokens": max_tokens},
        )
    )

    return response["output"]["message"]["content"][0]["text"]


if __name__ == "__main__":
    sample_catalog = [
        {"bookId": "1", "title": "Brave New World", "author": "Aldous Huxley", "genre": "Sci-Fi"},
        {"bookId": "2", "title": "Sapiens", "author": "Yuval Noah Harari", "genre": "Non-Fiction"},
        {"bookId": "3", "title": "Atomic Habits", "author": "James Clear", "genre": "Self-Help"},
        {"bookId": "4", "title": "The Midnight Library", "author": "Matt Haig", "genre": "Fiction"},
    ]
    print(
        recommend_books(
            user_id="demo-user",
            order_history=["1984", "The Great Gatsby"],
            catalog=sample_catalog,
        )
    )
