/**
 * Test script for LaunchDarkly AI Config + Bedrock integration
 *
 * Prerequisites:
 * 1. Set environment variables:
 *    - LAUNCHDARKLY_SDK_KEY: Your LaunchDarkly SDK key (sdk-...)
 *    - AWS_REGION: AWS region (default: us-east-1)
 *    - AWS credentials configured (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, or ~/.aws/credentials)
 *
 * 2. Create AI Config in LaunchDarkly:
 *    - Key: book-recommendations
 *    - Mode: Completion
 *    - Variations: sonnet, opus (see INTEGRATION.md)
 *
 * Usage:
 *    npm install
 *    export LAUNCHDARKLY_SDK_KEY="sdk-your-key"
 *    npm test
 */

import * as LaunchDarkly from '@launchdarkly/node-server-sdk';
import { initAi } from '@launchdarkly/server-sdk-ai';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

// Configuration
const SDK_KEY = process.env.LAUNCHDARKLY_SDK_KEY;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const DEFAULT_MODEL_ID = 'us.anthropic.claude-3-5-sonnet-20241022-v2:0';

// Sample data for testing
const SAMPLE_ORDER_HISTORY = [
  'The Great Gatsby',
  'To Kill a Mockingbird',
  '1984',
];

const SAMPLE_CATALOG = [
  { bookId: '1', title: 'The Catcher in the Rye', author: 'J.D. Salinger', genre: 'Fiction' },
  { bookId: '2', title: 'Brave New World', author: 'Aldous Huxley', genre: 'Science Fiction' },
  { bookId: '3', title: 'The Road', author: 'Cormac McCarthy', genre: 'Fiction' },
  { bookId: '4', title: 'Sapiens', author: 'Yuval Noah Harari', genre: 'Non-Fiction' },
  { bookId: '5', title: 'Atomic Habits', author: 'James Clear', genre: 'Self-Help' },
  { bookId: '6', title: 'The Midnight Library', author: 'Matt Haig', genre: 'Fiction' },
  { bookId: '7', title: 'Project Hail Mary', author: 'Andy Weir', genre: 'Science Fiction' },
];

// Bedrock client
const bedrockClient = new BedrockRuntimeClient({ region: AWS_REGION });

/**
 * Call Bedrock Claude to generate recommendations
 */
async function generateRecommendations(modelId, instructions, orderHistory, catalog) {
  const prompt = `${instructions}

User's previously purchased books:
${orderHistory.join(', ')}

Available books in our catalog:
${catalog.map((b) => `- "${b.title}" by ${b.author} (${b.genre}) [ID: ${b.bookId}]`).join('\n')}

Based on the user's reading history, recommend exactly 3 books from the catalog.
For each book, explain why it would appeal to this reader.

Respond in this exact JSON format:
{
  "recommendations": [
    {"bookId": "1", "title": "Book Title", "author": "Author Name", "reason": "Why this book is recommended"}
  ]
}`;

  console.log('\n📤 Sending prompt to Bedrock...\n');

  const response = await bedrockClient.send(
    new InvokeModelCommand({
      modelId: modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    })
  );

  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  const content = responseBody.content[0].text;

  // Parse JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }

  return { recommendations: [], raw: content };
}

/**
 * Main test function
 */
async function main() {
  console.log('🚀 LaunchDarkly + Bedrock Integration Test\n');
  console.log('='.repeat(50));

  // Check for SDK key
  if (!SDK_KEY) {
    console.error('\n❌ Error: LAUNCHDARKLY_SDK_KEY environment variable not set');
    console.log('\nUsage:');
    console.log('  export LAUNCHDARKLY_SDK_KEY="sdk-your-key"');
    console.log('  npm test');
    process.exit(1);
  }

  console.log(`\n📍 AWS Region: ${AWS_REGION}`);
  console.log(`🔑 SDK Key: ${SDK_KEY.substring(0, 10)}...`);

  let ldClient;
  let aiClient;
  let modelId = DEFAULT_MODEL_ID;
  let instructions = 'You are a book recommendation assistant.';

  try {
    // Initialize LaunchDarkly
    console.log('\n⏳ Connecting to LaunchDarkly...');
    ldClient = LaunchDarkly.init(SDK_KEY);
    await ldClient.waitForInitialization({ timeout: 10 });
    console.log('✅ LaunchDarkly connected!');

    // Initialize AI client
    aiClient = initAi(ldClient);

    // Create test context
    const context = {
      kind: 'user',
      key: 'test-user-123',
      name: 'Test User',
    };

    // Get AI Config
    console.log('\n⏳ Fetching AI Config "book-recommendations"...');

    const config = await aiClient.config(
      'book-recommendations',
      context,
      {
        model: { name: DEFAULT_MODEL_ID },
        enabled: true,
      }
    );

    if (config.enabled && config.model?.name) {
      modelId = config.model.name;
      console.log(`✅ AI Config found!`);
      console.log(`   Model: ${modelId}`);

      if (config.messages?.[0]?.content) {
        instructions = config.messages[0].content;
        console.log(`   Instructions: "${instructions.substring(0, 50)}..."`);
      }
    } else {
      console.log('⚠️  AI Config not found or disabled, using defaults');
      console.log(`   Model: ${modelId}`);
    }

  } catch (error) {
    console.log(`\n⚠️  LaunchDarkly error: ${error.message}`);
    console.log('   Continuing with default model...');
    console.log(`   Model: ${modelId}`);
  }

  // Generate recommendations
  console.log('\n' + '='.repeat(50));
  console.log('📚 Generating Book Recommendations');
  console.log('='.repeat(50));
  console.log(`\nUsing model: ${modelId}`);
  console.log(`Order history: ${SAMPLE_ORDER_HISTORY.join(', ')}`);

  try {
    const result = await generateRecommendations(
      modelId,
      instructions,
      SAMPLE_ORDER_HISTORY,
      SAMPLE_CATALOG
    );

    console.log('\n✅ Recommendations generated!\n');
    console.log('='.repeat(50));

    if (result.recommendations && result.recommendations.length > 0) {
      result.recommendations.forEach((rec, i) => {
        console.log(`\n📖 Recommendation ${i + 1}:`);
        console.log(`   Title: ${rec.title}`);
        console.log(`   Author: ${rec.author}`);
        console.log(`   Reason: ${rec.reason}`);
      });
    } else {
      console.log('\nRaw response:', result.raw || result);
    }

  } catch (error) {
    console.error('\n❌ Bedrock error:', error.message);

    if (error.message.includes('AccessDeniedException')) {
      console.log('\n💡 Make sure your AWS credentials have Bedrock access');
      console.log('   and the model is enabled in your AWS account.');
    }
  }

  // Cleanup
  if (ldClient) {
    console.log('\n\n⏳ Closing LaunchDarkly connection...');
    await ldClient.close();
    console.log('✅ Done!');
  }

  console.log('\n' + '='.repeat(50));
  console.log('🎉 Test complete!');
  console.log('='.repeat(50));
  console.log('\nNext steps:');
  console.log('1. Go to LaunchDarkly → AI Configs → book-recommendations');
  console.log('2. Change targeting from "sonnet" to "opus"');
  console.log('3. Run this test again to see different recommendations!');
}

main().catch(console.error);
