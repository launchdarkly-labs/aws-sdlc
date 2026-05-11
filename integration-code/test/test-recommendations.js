/**
 * Test script for LaunchDarkly AI Config + Bedrock integration.
 *
 * Prerequisites:
 *   1. export LAUNCHDARKLY_SDK_KEY="sdk-..."
 *   2. AWS credentials with Bedrock access (us-east-1 by default)
 *   3. AI Config "book-recommendations" exists in LaunchDarkly (Completion mode)
 *      with variations "safe-sonnet" and "adventurous-opus".
 *
 * Usage:
 *   npm install
 *   npm test
 */

import { init as initLD } from '@launchdarkly/node-server-sdk';
import { initAi } from '@launchdarkly/server-sdk-ai';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

const SDK_KEY = process.env.LAUNCHDARKLY_SDK_KEY;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const AI_CONFIG_KEY = 'book-recommendations';
const DEFAULT_MODEL_ID = 'us.anthropic.claude-3-5-sonnet-20241022-v2:0';
const DEFAULT_INSTRUCTIONS = 'You are a book recommendation assistant.';

const SAMPLE_ORDER_HISTORY = ['The Great Gatsby', 'To Kill a Mockingbird', '1984'];

const SAMPLE_CATALOG = [
  { bookId: '1', title: 'The Catcher in the Rye', author: 'J.D. Salinger', genre: 'Fiction' },
  { bookId: '2', title: 'Brave New World', author: 'Aldous Huxley', genre: 'Science Fiction' },
  { bookId: '3', title: 'The Road', author: 'Cormac McCarthy', genre: 'Fiction' },
  { bookId: '4', title: 'Sapiens', author: 'Yuval Noah Harari', genre: 'Non-Fiction' },
  { bookId: '5', title: 'Atomic Habits', author: 'James Clear', genre: 'Self-Help' },
  { bookId: '6', title: 'The Midnight Library', author: 'Matt Haig', genre: 'Fiction' },
  { bookId: '7', title: 'Project Hail Mary', author: 'Andy Weir', genre: 'Science Fiction' },
];

const bedrockClient = new BedrockRuntimeClient({ region: AWS_REGION });

function buildPrompt(orderHistory, catalog, maxRecommendations) {
  return `User's previously purchased books:
${orderHistory.join(', ')}

Available books in our catalog:
${catalog.map((b) => `- "${b.title}" by ${b.author} (${b.genre}) [ID: ${b.bookId}]`).join('\n')}

Recommend exactly ${maxRecommendations} books from the catalog. For each, explain why it would appeal to this reader.

Respond ONLY with JSON: {"recommendations":[{"bookId":"id","title":"Title","author":"Author","reason":"Why"}]}`;
}

async function main() {
  console.log('LaunchDarkly + Bedrock Integration Test\n' + '='.repeat(50));

  if (!SDK_KEY) {
    console.error('Missing LAUNCHDARKLY_SDK_KEY environment variable.');
    console.error('Usage: export LAUNCHDARKLY_SDK_KEY="sdk-..." && npm test');
    process.exit(1);
  }

  console.log(`AWS region: ${AWS_REGION}`);
  console.log(`SDK key:    ${SDK_KEY.substring(0, 10)}...`);

  const ldClient = initLD(SDK_KEY);
  await ldClient.waitForInitialization({ timeout: 10 });
  const aiClient = initAi(ldClient);
  console.log('LaunchDarkly connected.\n');

  const context = { kind: 'user', key: 'test-user-123', name: 'Test User' };

  const config = await aiClient.completionConfig(
    AI_CONFIG_KEY,
    context,
    {
      enabled: true,
      model: { name: DEFAULT_MODEL_ID, parameters: { temperature: 0.5, maxTokens: 1024 } },
      messages: [{ role: 'system', content: DEFAULT_INSTRUCTIONS }],
    }
  );

  const modelId = config.enabled && config.model?.name ? config.model.name : DEFAULT_MODEL_ID;
  const instructions = config.messages?.[0]?.content ?? DEFAULT_INSTRUCTIONS;
  const maxRecommendations = config.model?.custom?.maxRecommendations ?? 3;
  const temperature = config.model?.parameters?.temperature ?? 0.5;
  const maxTokens = config.model?.parameters?.maxTokens ?? 1024;

  console.log(`AI Config (${AI_CONFIG_KEY}):`);
  console.log(`  enabled:             ${config.enabled}`);
  console.log(`  model:               ${modelId}`);
  console.log(`  temperature:         ${temperature}`);
  console.log(`  maxRecommendations:  ${maxRecommendations}`);
  console.log(`  instructions:        ${instructions.substring(0, 80)}...\n`);

  console.log('Generating recommendations via Bedrock Converse...');
  const prompt = buildPrompt(SAMPLE_ORDER_HISTORY, SAMPLE_CATALOG, maxRecommendations);

  const invokeBedrock = () =>
    bedrockClient.send(
      new ConverseCommand({
        modelId,
        system: [{ text: instructions }],
        messages: [{ role: 'user', content: [{ text: prompt }] }],
        inferenceConfig: { temperature, maxTokens },
      })
    );

  const response = config.tracker
    ? await config.tracker.trackBedrockConverseMetrics(invokeBedrock)
    : await invokeBedrock();

  const text = response.output?.message?.content?.[0]?.text ?? '';
  const match = text.match(/\{[\s\S]*\}/);
  const parsed = match ? JSON.parse(match[0]) : { recommendations: [] };

  console.log('\n' + '='.repeat(50));
  if (parsed.recommendations?.length) {
    parsed.recommendations.forEach((rec, i) => {
      console.log(`\nRecommendation ${i + 1}:`);
      console.log(`  ${rec.title} - ${rec.author}`);
      console.log(`  Why: ${rec.reason}`);
    });
  } else {
    console.log('Raw response:', text);
  }
  console.log('\n' + '='.repeat(50));

  await ldClient.close();

  console.log('\nTry switching the variation in LaunchDarkly (safe-sonnet → adventurous-opus)');
  console.log('and run npm test again to see different recommendations.');
}

main().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});
