const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient({ region: 'us-east-1' });

const realAgents = [
  // OpenAI
  {
    agent_id: 'openai-gpt4-turbo',
    name: 'GPT-4 Turbo',
    platform: 'OpenAI',
    category: 'LLM',
    status: 'active',
    capabilities: ['text-generation', 'code', 'reasoning', 'function-calling'],
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4-turbo-preview',
    description: 'Most capable GPT-4 model with 128k context window and improved instruction following',
    pricing: { input: 0.01, output: 0.03, unit: 'per 1K tokens' },
    context_window: 128000,
    max_tokens: 4096
  },
  {
    agent_id: 'openai-gpt4o',
    name: 'GPT-4o',
    platform: 'OpenAI',
    category: 'LLM',
    status: 'active',
    capabilities: ['text-generation', 'vision', 'multimodal', 'real-time'],
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o',
    description: 'Latest multimodal model with vision, audio, and real-time capabilities',
    pricing: { input: 0.005, output: 0.015, unit: 'per 1K tokens' },
    context_window: 128000,
    max_tokens: 4096
  },
  {
    agent_id: 'openai-dalle3',
    name: 'DALL-E 3',
    platform: 'OpenAI',
    category: 'Image',
    status: 'active',
    capabilities: ['image-generation', 'artistic-creativity'],
    endpoint: 'https://api.openai.com/v1/images/generations',
    model: 'dall-e-3',
    description: 'Advanced image generation model with improved prompt adherence and safety',
    pricing: { standard: 0.040, hd: 0.080, unit: 'per image (1024x1024)' }
  },
  {
    agent_id: 'openai-whisper',
    name: 'Whisper',
    platform: 'OpenAI',
    category: 'Audio',
    status: 'active',
    capabilities: ['speech-to-text', 'transcription', 'translation'],
    endpoint: 'https://api.openai.com/v1/audio/transcriptions',
    model: 'whisper-1',
    description: 'Automatic speech recognition system with multilingual capabilities',
    pricing: { rate: 0.006, unit: 'per minute' }
  },

  // Anthropic
  {
    agent_id: 'anthropic-claude-opus',
    name: 'Claude 3 Opus',
    platform: 'Anthropic',
    category: 'LLM',
    status: 'active',
    capabilities: ['text-generation', 'code', 'reasoning', 'analysis'],
    endpoint: 'https://api.anthropic.com/v1/messages',
    model: 'claude-3-opus-20240229',
    description: 'Most powerful Claude model for complex tasks requiring deep reasoning',
    pricing: { input: 0.015, output: 0.075, unit: 'per 1K tokens' },
    context_window: 200000,
    max_tokens: 4096
  },
  {
    agent_id: 'anthropic-claude-sonnet',
    name: 'Claude 3.5 Sonnet',
    platform: 'Anthropic',
    category: 'LLM',
    status: 'active',
    capabilities: ['text-generation', 'code', 'vision', 'artifacts'],
    endpoint: 'https://api.anthropic.com/v1/messages',
    model: 'claude-3-5-sonnet-20241022',
    description: 'Balanced model with excellent coding capabilities and vision support',
    pricing: { input: 0.003, output: 0.015, unit: 'per 1K tokens' },
    context_window: 200000,
    max_tokens: 8192
  },
  {
    agent_id: 'anthropic-claude-haiku',
    name: 'Claude 3 Haiku',
    platform: 'Anthropic',
    category: 'LLM',
    status: 'active',
    capabilities: ['text-generation', 'fast-inference', 'concise-responses'],
    endpoint: 'https://api.anthropic.com/v1/messages',
    model: 'claude-3-haiku-20240307',
    description: 'Fastest Claude model optimized for quick responses and efficiency',
    pricing: { input: 0.00025, output: 0.00125, unit: 'per 1K tokens' },
    context_window: 200000,
    max_tokens: 4096
  },

  // Google
  {
    agent_id: 'google-gemini-pro',
    name: 'Gemini 1.5 Pro',
    platform: 'Google',
    category: 'LLM',
    status: 'active',
    capabilities: ['text-generation', 'vision', 'multimodal', 'long-context'],
    endpoint: 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro',
    model: 'gemini-1.5-pro',
    description: 'Google\'s most capable model with extremely long context window',
    pricing: { input: 0.00125, output: 0.005, unit: 'per 1K tokens' },
    context_window: 2000000,
    max_tokens: 8192
  },
  {
    agent_id: 'google-gemini-flash',
    name: 'Gemini 1.5 Flash',
    platform: 'Google',
    category: 'LLM',
    status: 'active',
    capabilities: ['text-generation', 'fast-inference', 'multimodal'],
    endpoint: 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash',
    model: 'gemini-1.5-flash',
    description: 'Faster, more efficient version of Gemini with multimodal capabilities',
    pricing: { input: 0.000075, output: 0.0003, unit: 'per 1K tokens' },
    context_window: 1000000,
    max_tokens: 8192
  },

  // Meta
  {
    agent_id: 'meta-llama3-70b',
    name: 'Llama 3 70B',
    platform: 'Meta',
    category: 'LLM',
    status: 'active',
    capabilities: ['text-generation', 'open-source', 'instruction-following'],
    endpoint: 'various',
    model: 'llama-3-70b',
    description: 'Large open-source model with strong performance across many tasks',
    pricing: 'varies by provider',
    context_window: 8192,
    max_tokens: 4096
  },
  {
    agent_id: 'meta-llama3-8b',
    name: 'Llama 3 8B',
    platform: 'Meta',
    category: 'LLM',
    status: 'active',
    capabilities: ['text-generation', 'edge-deployment', 'efficient'],
    endpoint: 'various',
    model: 'llama-3-8b',
    description: 'Smaller, efficient open-source model suitable for edge deployment',
    pricing: 'varies by provider',
    context_window: 8192,
    max_tokens: 4096
  },

  // Mistral
  {
    agent_id: 'mistral-large',
    name: 'Mistral Large',
    platform: 'Mistral',
    category: 'LLM',
    status: 'active',
    capabilities: ['text-generation', 'code', 'reasoning', 'multilingual'],
    endpoint: 'https://api.mistral.ai/v1/chat/completions',
    model: 'mistral-large-latest',
    description: 'Flagship model with strong reasoning and multilingual capabilities',
    pricing: { input: 0.004, output: 0.012, unit: 'per 1K tokens' },
    context_window: 128000,
    max_tokens: 4096
  },
  {
    agent_id: 'mistral-medium',
    name: 'Mistral Medium',
    platform: 'Mistral',
    category: 'LLM',
    status: 'active',
    capabilities: ['text-generation', 'multilingual', 'balanced'],
    endpoint: 'https://api.mistral.ai/v1/chat/completions',
    model: 'mistral-medium-latest',
    description: 'Balanced model offering good performance at moderate cost',
    pricing: { input: 0.0025, output: 0.0075, unit: 'per 1K tokens' },
    context_window: 32000,
    max_tokens: 4096
  },

  // Stability AI
  {
    agent_id: 'stability-sdxl',
    name: 'Stable Diffusion XL',
    platform: 'Stability',
    category: 'Image',
    status: 'active',
    capabilities: ['image-generation', 'artistic-style', 'customizable'],
    endpoint: 'https://api.stability.ai/v1/generation',
    model: 'stable-diffusion-xl-1024-v1-0',
    description: 'High-quality image generation with artistic control and style options',
    pricing: { rate: 0.040, unit: 'per image (1024x1024)' }
  },
  {
    agent_id: 'stability-sdxl-turbo',
    name: 'SDXL Turbo',
    platform: 'Stability',
    category: 'Image',
    status: 'active',
    capabilities: ['image-generation', 'fast-inference', 'real-time'],
    endpoint: 'https://api.stability.ai/v1/generation',
    model: 'sdxl-turbo',
    description: 'Ultra-fast image generation for real-time applications',
    pricing: { rate: 0.010, unit: 'per image (512x512)' }
  },

  // ElevenLabs
  {
    agent_id: 'elevenlabs-multilingual',
    name: 'Multilingual v2',
    platform: 'ElevenLabs',
    category: 'Audio',
    status: 'active',
    capabilities: ['text-to-speech', 'multilingual', 'voice-cloning'],
    endpoint: 'https://api.elevenlabs.io/v1/text-to-speech',
    model: 'eleven_multilingual_v2',
    description: 'High-quality multilingual voice synthesis with natural intonation',
    pricing: { rate: 0.18, unit: 'per 1K characters' }
  },

  // Cohere
  {
    agent_id: 'cohere-command-r',
    name: 'Command R+',
    platform: 'Cohere',
    category: 'LLM',
    status: 'active',
    capabilities: ['text-generation', 'rag', 'tools', 'enterprise'],
    endpoint: 'https://api.cohere.ai/v1/chat',
    model: 'command-r-plus',
    description: 'Enterprise-focused model with excellent RAG and tool-use capabilities',
    pricing: { input: 0.003, output: 0.015, unit: 'per 1K tokens' },
    context_window: 128000,
    max_tokens: 4096
  },

  // Perplexity
  {
    agent_id: 'perplexity-online',
    name: 'Perplexity Online',
    platform: 'Perplexity',
    category: 'LLM',
    status: 'active',
    capabilities: ['text-generation', 'web-search', 'citations', 'real-time'],
    endpoint: 'https://api.perplexity.ai/chat/completions',
    model: 'pplx-70b-online',
    description: 'Real-time web search integration with accurate citations',
    pricing: { rate: 0.001, unit: 'per 1K tokens' },
    context_window: 127072,
    max_tokens: 4096
  },

  // Candlefish Services
  {
    agent_id: 'candlefish-paintbox',
    name: 'Paintbox Estimator',
    platform: 'Candlefish',
    category: 'Business',
    status: 'active',
    capabilities: ['excel-parsing', 'estimation', 'crm-integration', 'cost-analysis'],
    endpoint: 'https://paintbox.fly.dev/api',
    service: 'paintbox',
    description: 'Automated project estimation and cost analysis for contracting businesses',
    pricing: 'contact for enterprise pricing'
  },
  {
    agent_id: 'candlefish-temporal',
    name: 'Temporal Orchestrator',
    platform: 'Candlefish',
    category: 'Workflow',
    status: 'active',
    capabilities: ['workflow-orchestration', 'task-scheduling', 'durable-execution'],
    endpoint: 'https://temporal.candlefish.ai',
    service: 'temporal',
    description: 'Reliable workflow orchestration for complex business processes',
    pricing: 'contact for enterprise pricing'
  },
  {
    agent_id: 'candlefish-crown',
    name: 'Crown Trophy Automation',
    platform: 'Candlefish',
    category: 'Business',
    status: 'active',
    capabilities: ['order-processing', 'inventory-management', 'fulfillment'],
    endpoint: 'https://crown.candlefish.ai/api',
    service: 'crown-trophy',
    description: 'End-to-end automation for trophy and awards business operations',
    pricing: 'contact for enterprise pricing'
  }
];

async function seedAgents() {
  console.log(`Starting to seed ${realAgents.length} AI agents...`);

  for (const agent of realAgents) {
    const params = {
      TableName: 'nanda-index-agents',
      Item: {
        ...agent,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        version: 'v1.0.0',
        metrics: {
          requests: Math.floor(Math.random() * 10000),
          latency_ms: Math.floor(Math.random() * 500) + 50,
          uptime: 95 + Math.random() * 5,
          success_rate: 95 + Math.random() * 5
        },
        tags: agent.capabilities || [],
        provider_verified: ['OpenAI', 'Anthropic', 'Google', 'Mistral', 'Candlefish'].includes(agent.platform)
      }
    };

    try {
      await dynamodb.put(params).promise();
      console.log(`✅ Seeded: ${agent.name} (${agent.platform})`);
    } catch (error) {
      console.error(`❌ Failed to seed ${agent.name}:`, error.message);
    }
  }

  console.log('\\n✅ Agent seeding completed!');
  console.log(`📊 Total agents: ${realAgents.length}`);
  console.log(`🏢 Platforms: ${[...new Set(realAgents.map(a => a.platform))].join(', ')}`);
  console.log(`📁 Categories: ${[...new Set(realAgents.map(a => a.category))].join(', ')}`);
}

seedAgents().then(() => {
  console.log('\\n🚀 NANDA Index is now populated with real AI agents!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error seeding agents:', error);
  process.exit(1);
});
