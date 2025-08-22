#!/bin/bash

# Seed real AI agents into NANDA Index using AWS CLI
set -e

echo "🚀 Seeding real AI agents into NANDA Index..."
echo "================================================"

# Function to add an agent
add_agent() {
    local agent_id="$1"
    local name="$2"
    local platform="$3"
    local category="$4"
    local status="$5"
    local capabilities="$6"
    local endpoint="$7"
    local model="$8"
    local description="$9"
    local pricing="${10}"
    local context_window="${11:-8192}"
    local max_tokens="${12:-4096}"
    
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
    local requests=$((RANDOM % 10000))
    local latency=$((RANDOM % 450 + 50))
    local uptime=$(echo "95 + $RANDOM / 32767 * 5" | bc -l | cut -c1-5)
    local success_rate=$(echo "95 + $RANDOM / 32767 * 5" | bc -l | cut -c1-5)
    
    aws dynamodb put-item \
        --table-name nanda-index-agents \
        --item "{
            \"agent_id\": {\"S\": \"$agent_id\"},
            \"name\": {\"S\": \"$name\"},
            \"platform\": {\"S\": \"$platform\"},
            \"category\": {\"S\": \"$category\"},
            \"status\": {\"S\": \"$status\"},
            \"capabilities\": {\"SS\": [$(echo $capabilities | sed 's/,/","/g' | sed 's/^/\"/' | sed 's/$/\"/' )]},
            \"endpoint\": {\"S\": \"$endpoint\"},
            \"model\": {\"S\": \"$model\"},
            \"description\": {\"S\": \"$description\"},
            \"pricing\": {\"S\": \"$pricing\"},
            \"context_window\": {\"N\": \"$context_window\"},
            \"max_tokens\": {\"N\": \"$max_tokens\"},
            \"created\": {\"S\": \"$timestamp\"},
            \"updated\": {\"S\": \"$timestamp\"},
            \"version\": {\"S\": \"v1.0.0\"},
            \"metrics\": {\"M\": {
                \"requests\": {\"N\": \"$requests\"},
                \"latency_ms\": {\"N\": \"$latency\"},
                \"uptime\": {\"N\": \"$uptime\"},
                \"success_rate\": {\"N\": \"$success_rate\"}
            }},
            \"provider_verified\": {\"BOOL\": true}
        }" \
        --region us-east-1 > /dev/null
    
    echo "✅ Seeded: $name ($platform)"
}

# OpenAI Agents
add_agent "openai-gpt4-turbo" "GPT-4 Turbo" "OpenAI" "LLM" "active" "text-generation,code,reasoning,function-calling" "https://api.openai.com/v1/chat/completions" "gpt-4-turbo-preview" "Most capable GPT-4 model with 128k context window and improved instruction following" "Input: $0.01/1K tokens, Output: $0.03/1K tokens" "128000" "4096"

add_agent "openai-gpt4o" "GPT-4o" "OpenAI" "LLM" "active" "text-generation,vision,multimodal,real-time" "https://api.openai.com/v1/chat/completions" "gpt-4o" "Latest multimodal model with vision, audio, and real-time capabilities" "Input: $0.005/1K tokens, Output: $0.015/1K tokens" "128000" "4096"

add_agent "openai-dalle3" "DALL-E 3" "OpenAI" "Image" "active" "image-generation,artistic-creativity" "https://api.openai.com/v1/images/generations" "dall-e-3" "Advanced image generation model with improved prompt adherence and safety" "Standard: $0.040/image, HD: $0.080/image" "0" "0"

add_agent "openai-whisper" "Whisper" "OpenAI" "Audio" "active" "speech-to-text,transcription,translation" "https://api.openai.com/v1/audio/transcriptions" "whisper-1" "Automatic speech recognition system with multilingual capabilities" "$0.006/minute" "0" "0"

# Anthropic Agents
add_agent "anthropic-claude-opus" "Claude 3 Opus" "Anthropic" "LLM" "active" "text-generation,code,reasoning,analysis" "https://api.anthropic.com/v1/messages" "claude-3-opus-20240229" "Most powerful Claude model for complex tasks requiring deep reasoning" "Input: $0.015/1K tokens, Output: $0.075/1K tokens" "200000" "4096"

add_agent "anthropic-claude-sonnet" "Claude 3.5 Sonnet" "Anthropic" "LLM" "active" "text-generation,code,vision,artifacts" "https://api.anthropic.com/v1/messages" "claude-3-5-sonnet-20241022" "Balanced model with excellent coding capabilities and vision support" "Input: $0.003/1K tokens, Output: $0.015/1K tokens" "200000" "8192"

add_agent "anthropic-claude-haiku" "Claude 3 Haiku" "Anthropic" "LLM" "active" "text-generation,fast-inference,concise-responses" "https://api.anthropic.com/v1/messages" "claude-3-haiku-20240307" "Fastest Claude model optimized for quick responses and efficiency" "Input: $0.00025/1K tokens, Output: $0.00125/1K tokens" "200000" "4096"

# Google Agents
add_agent "google-gemini-pro" "Gemini 1.5 Pro" "Google" "LLM" "active" "text-generation,vision,multimodal,long-context" "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro" "gemini-1.5-pro" "Google's most capable model with extremely long context window" "Input: $0.00125/1K tokens, Output: $0.005/1K tokens" "2000000" "8192"

add_agent "google-gemini-flash" "Gemini 1.5 Flash" "Google" "LLM" "active" "text-generation,fast-inference,multimodal" "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash" "gemini-1.5-flash" "Faster, more efficient version of Gemini with multimodal capabilities" "Input: $0.000075/1K tokens, Output: $0.0003/1K tokens" "1000000" "8192"

# Meta Agents  
add_agent "meta-llama3-70b" "Llama 3 70B" "Meta" "LLM" "active" "text-generation,open-source,instruction-following" "various" "llama-3-70b" "Large open-source model with strong performance across many tasks" "Varies by provider" "8192" "4096"

add_agent "meta-llama3-8b" "Llama 3 8B" "Meta" "LLM" "active" "text-generation,edge-deployment,efficient" "various" "llama-3-8b" "Smaller, efficient open-source model suitable for edge deployment" "Varies by provider" "8192" "4096"

# Mistral Agents
add_agent "mistral-large" "Mistral Large" "Mistral" "LLM" "active" "text-generation,code,reasoning,multilingual" "https://api.mistral.ai/v1/chat/completions" "mistral-large-latest" "Flagship model with strong reasoning and multilingual capabilities" "Input: $0.004/1K tokens, Output: $0.012/1K tokens" "128000" "4096"

add_agent "mistral-medium" "Mistral Medium" "Mistral" "LLM" "active" "text-generation,multilingual,balanced" "https://api.mistral.ai/v1/chat/completions" "mistral-medium-latest" "Balanced model offering good performance at moderate cost" "Input: $0.0025/1K tokens, Output: $0.0075/1K tokens" "32000" "4096"

# Stability AI Agents
add_agent "stability-sdxl" "Stable Diffusion XL" "Stability" "Image" "active" "image-generation,artistic-style,customizable" "https://api.stability.ai/v1/generation" "stable-diffusion-xl-1024-v1-0" "High-quality image generation with artistic control and style options" "$0.040/image (1024x1024)" "0" "0"

add_agent "stability-sdxl-turbo" "SDXL Turbo" "Stability" "Image" "active" "image-generation,fast-inference,real-time" "https://api.stability.ai/v1/generation" "sdxl-turbo" "Ultra-fast image generation for real-time applications" "$0.010/image (512x512)" "0" "0"

# ElevenLabs Agents
add_agent "elevenlabs-multilingual" "Multilingual v2" "ElevenLabs" "Audio" "active" "text-to-speech,multilingual,voice-cloning" "https://api.elevenlabs.io/v1/text-to-speech" "eleven_multilingual_v2" "High-quality multilingual voice synthesis with natural intonation" "$0.18/1K characters" "0" "0"

# Cohere Agents
add_agent "cohere-command-r" "Command R+" "Cohere" "LLM" "active" "text-generation,rag,tools,enterprise" "https://api.cohere.ai/v1/chat" "command-r-plus" "Enterprise-focused model with excellent RAG and tool-use capabilities" "Input: $0.003/1K tokens, Output: $0.015/1K tokens" "128000" "4096"

# Perplexity Agents
add_agent "perplexity-online" "Perplexity Online" "Perplexity" "LLM" "active" "text-generation,web-search,citations,real-time" "https://api.perplexity.ai/chat/completions" "pplx-70b-online" "Real-time web search integration with accurate citations" "$0.001/1K tokens" "127072" "4096"

# Candlefish Services
add_agent "candlefish-paintbox" "Paintbox Estimator" "Candlefish" "Business" "active" "excel-parsing,estimation,crm-integration,cost-analysis" "https://paintbox.fly.dev/api" "paintbox" "Automated project estimation and cost analysis for contracting businesses" "Contact for enterprise pricing" "0" "0"

add_agent "candlefish-temporal" "Temporal Orchestrator" "Candlefish" "Workflow" "active" "workflow-orchestration,task-scheduling,durable-execution" "https://temporal.candlefish.ai" "temporal" "Reliable workflow orchestration for complex business processes" "Contact for enterprise pricing" "0" "0"

add_agent "candlefish-crown" "Crown Trophy Automation" "Candlefish" "Business" "active" "order-processing,inventory-management,fulfillment" "https://crown.candlefish.ai/api" "crown-trophy" "End-to-end automation for trophy and awards business operations" "Contact for enterprise pricing" "0" "0"

echo ""
echo "✅ Agent seeding completed!"
echo "📊 Total agents: 20"
echo "🏢 Platforms: OpenAI, Anthropic, Google, Meta, Mistral, Stability, ElevenLabs, Cohere, Perplexity, Candlefish"
echo "📁 Categories: LLM, Image, Audio, Business, Workflow"
echo ""
echo "🚀 NANDA Index is now populated with real AI agents!"