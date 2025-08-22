#!/usr/bin/env node

/**
 * Seed script for NANDA Index - Populates initial AI agents
 */

const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({ region: 'us-east-1' });
const dynamodb = new AWS.DynamoDB.DocumentClient();

// Initial agent data
const agents = [
  {
    agent_id: 'gpt-4-turbo',
    agent_name: 'urn:nanda:openai:gpt-4-turbo',
    primary_facts_url: 'https://api.nanda.candlefish.ai/facts/gpt-4-turbo.json',
    private_facts_url: 'ipfs://QmGPT4Turbo',
    adaptive_resolver_url: 'https://resolver.nanda.candlefish.ai/gpt-4-turbo',
    ttl: 3600,
    capabilities: ['text-generation', 'code-generation', 'analysis', 'vision'],
    vendor: 'OpenAI',
    version: 1,
    updated_at: Date.now()
  },
  {
    agent_id: 'claude-3-opus',
    agent_name: 'urn:nanda:anthropic:claude-3-opus',
    primary_facts_url: 'https://api.nanda.candlefish.ai/facts/claude-3-opus.json',
    private_facts_url: 'ipfs://QmClaude3Opus',
    adaptive_resolver_url: 'https://resolver.nanda.candlefish.ai/claude-3-opus',
    ttl: 3600,
    capabilities: ['text-generation', 'analysis', 'coding', 'creative-writing'],
    vendor: 'Anthropic',
    version: 1,
    updated_at: Date.now()
  },
  {
    agent_id: 'claude-3-sonnet',
    agent_name: 'urn:nanda:anthropic:claude-3-sonnet',
    primary_facts_url: 'https://api.nanda.candlefish.ai/facts/claude-3-sonnet.json',
    private_facts_url: 'ipfs://QmClaude3Sonnet',
    adaptive_resolver_url: 'https://resolver.nanda.candlefish.ai/claude-3-sonnet',
    ttl: 3600,
    capabilities: ['text-generation', 'analysis', 'coding'],
    vendor: 'Anthropic',
    version: 1,
    updated_at: Date.now()
  },
  {
    agent_id: 'gemini-1.5-pro',
    agent_name: 'urn:nanda:google:gemini-1.5-pro',
    primary_facts_url: 'https://api.nanda.candlefish.ai/facts/gemini-1.5-pro.json',
    private_facts_url: 'ipfs://QmGemini15Pro',
    adaptive_resolver_url: 'https://resolver.nanda.candlefish.ai/gemini-1.5-pro',
    ttl: 3600,
    capabilities: ['text-generation', 'multimodal', 'long-context'],
    vendor: 'Google',
    version: 1,
    updated_at: Date.now()
  },
  {
    agent_id: 'llama-3-70b',
    agent_name: 'urn:nanda:meta:llama-3-70b',
    primary_facts_url: 'https://api.nanda.candlefish.ai/facts/llama-3-70b.json',
    private_facts_url: 'ipfs://QmLlama370B',
    adaptive_resolver_url: 'https://resolver.nanda.candlefish.ai/llama-3-70b',
    ttl: 3600,
    capabilities: ['text-generation', 'instruction-following'],
    vendor: 'Meta',
    version: 1,
    updated_at: Date.now()
  },
  {
    agent_id: 'mistral-large',
    agent_name: 'urn:nanda:mistral:mistral-large',
    primary_facts_url: 'https://api.nanda.candlefish.ai/facts/mistral-large.json',
    private_facts_url: 'ipfs://QmMistralLarge',
    adaptive_resolver_url: 'https://resolver.nanda.candlefish.ai/mistral-large',
    ttl: 3600,
    capabilities: ['text-generation', 'coding', 'multilingual'],
    vendor: 'Mistral AI',
    version: 1,
    updated_at: Date.now()
  },
  {
    agent_id: 'dall-e-3',
    agent_name: 'urn:nanda:openai:dall-e-3',
    primary_facts_url: 'https://api.nanda.candlefish.ai/facts/dall-e-3.json',
    private_facts_url: 'ipfs://QmDallE3',
    adaptive_resolver_url: 'https://resolver.nanda.candlefish.ai/dall-e-3',
    ttl: 3600,
    capabilities: ['image-generation', 'text-to-image'],
    vendor: 'OpenAI',
    version: 1,
    updated_at: Date.now()
  },
  {
    agent_id: 'stable-diffusion-xl',
    agent_name: 'urn:nanda:stability:stable-diffusion-xl',
    primary_facts_url: 'https://api.nanda.candlefish.ai/facts/stable-diffusion-xl.json',
    private_facts_url: 'ipfs://QmStableDiffusionXL',
    adaptive_resolver_url: 'https://resolver.nanda.candlefish.ai/stable-diffusion-xl',
    ttl: 3600,
    capabilities: ['image-generation', 'text-to-image', 'image-to-image'],
    vendor: 'Stability AI',
    version: 1,
    updated_at: Date.now()
  },
  {
    agent_id: 'whisper-large-v3',
    agent_name: 'urn:nanda:openai:whisper-large-v3',
    primary_facts_url: 'https://api.nanda.candlefish.ai/facts/whisper-large-v3.json',
    private_facts_url: 'ipfs://QmWhisperLargeV3',
    adaptive_resolver_url: 'https://resolver.nanda.candlefish.ai/whisper-large-v3',
    ttl: 3600,
    capabilities: ['speech-to-text', 'transcription', 'translation'],
    vendor: 'OpenAI',
    version: 1,
    updated_at: Date.now()
  },
  {
    agent_id: 'elevenlabs-multilingual',
    agent_name: 'urn:nanda:elevenlabs:multilingual-v2',
    primary_facts_url: 'https://api.nanda.candlefish.ai/facts/elevenlabs-multilingual.json',
    private_facts_url: 'ipfs://QmElevenLabsMultilingual',
    adaptive_resolver_url: 'https://resolver.nanda.candlefish.ai/elevenlabs-multilingual',
    ttl: 3600,
    capabilities: ['text-to-speech', 'voice-cloning'],
    vendor: 'ElevenLabs',
    version: 1,
    updated_at: Date.now()
  }
];

// Agent facts data
const agentFacts = agents.map(agent => ({
  fact_id: `fact-${agent.agent_id}-${Date.now()}`,
  agent_id: agent.agent_id,
  facts: {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://nanda.candlefish.ai/v1/context'
    ],
    id: `https://nanda.candlefish.ai/credentials/${agent.agent_id}`,
    type: ['VerifiableCredential', 'AgentFacts'],
    issuer: {
      id: 'did:web:candlefish.ai',
      name: 'Candlefish AI',
      publicKey: '0x' + Buffer.from('candlefish-public-key').toString('hex')
    },
    issuanceDate: new Date().toISOString(),
    expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    credentialSubject: {
      id: agent.agent_id,
      capabilities: agent.capabilities.map(cap => ({
        type: cap,
        version: '1.0',
        endpoints: [{
          url: `https://api.${agent.vendor.toLowerCase()}.com/v1/${cap}`,
          protocol: 'https',
          ttl: 3600,
          priority: 90,
          region: 'us-east-1',
          rateLimit: {
            requests: 1000,
            window: 60
          }
        }]
      })),
      pricing: {
        model: 'usage',
        currency: 'USD',
        rates: {
          input: 0.01,
          output: 0.03
        },
        micropayment: true
      },
      compliance: {
        gdpr: true,
        ccpa: true,
        hipaa: false,
        sox: true,
        iso27001: true
      },
      metadata: {
        name: agent.agent_id,
        description: `${agent.vendor} ${agent.agent_id} AI agent`,
        vendor: agent.vendor,
        category: agent.capabilities,
        tags: [...agent.capabilities, agent.vendor.toLowerCase()]
      }
    },
    proof: {
      type: 'Ed25519Signature2020',
      created: new Date().toISOString(),
      verificationMethod: 'did:web:candlefish.ai#key-1',
      proofPurpose: 'assertionMethod',
      proofValue: Buffer.from('signature-placeholder').toString('base64')
    }
  },
  created_at: Date.now(),
  updated_at: Date.now()
}));

// Seed function
async function seedAgents() {
  console.log('🚀 Starting NANDA Index seed process...\n');

  // Seed agents table
  console.log('📝 Seeding agents table...');
  for (const agent of agents) {
    const params = {
      TableName: 'nanda-index-agents',
      Item: agent
    };

    try {
      await dynamodb.put(params).promise();
      console.log(`✅ Added agent: ${agent.agent_name}`);
    } catch (error) {
      console.error(`❌ Error adding agent ${agent.agent_name}:`, error);
    }
  }

  console.log('\n📝 Seeding agent facts table...');
  for (const fact of agentFacts) {
    const params = {
      TableName: 'nanda-index-agent-facts',
      Item: fact
    };

    try {
      await dynamodb.put(params).promise();
      console.log(`✅ Added facts for: ${fact.agent_id}`);
    } catch (error) {
      console.error(`❌ Error adding facts for ${fact.agent_id}:`, error);
    }
  }

  console.log('\n🎉 NANDA Index seed process complete!');
  console.log(`📊 Total agents seeded: ${agents.length}`);
  console.log(`📊 Total agent facts seeded: ${agentFacts.length}`);

  // Display summary
  console.log('\n📋 Seeded Agents Summary:');
  console.log('========================');
  agents.forEach(agent => {
    console.log(`• ${agent.vendor}: ${agent.agent_id}`);
    console.log(`  Capabilities: ${agent.capabilities.join(', ')}`);
  });

  console.log('\n🌍 NANDA Index is now ready for AI agent discovery!');
  console.log('🔗 API: https://api.nanda.candlefish.ai');
  console.log('📊 Dashboard: https://nanda.candlefish.ai');
  console.log('📚 Docs: https://docs.nanda.candlefish.ai');
}

// Run seed
seedAgents().catch(console.error);
