# AgentFacts Format

A standardized metadata schema for describing AI agents on the web, enabling discovery, interoperability, and trust verification in the agentic ecosystem.

## Overview

The AgentFacts format provides a comprehensive way to describe AI agents with machine-readable metadata, including their capabilities, endpoints, performance metrics, and trust credentials. This enables automated discovery and integration of agents across different platforms and providers.

## Key Features

- **Universal Agent Identity**: Unique identifiers and URN-based naming
- **Capability Declaration**: Detailed skill descriptions with input/output modalities
- **Performance Metrics**: Certified evaluations and real-time telemetry
- **Trust Framework**: Certification levels and audit trails
- **Dynamic Routing**: Support for adaptive endpoint resolution
- **Multi-Modal Support**: Text, audio, video, and image processing capabilities

## Repository Contents

- `agentfacts-schema.json` - JSON Schema definition for the AgentFacts format
- `README.md` - This documentation file

## Schema Structure

### Core Sections

1. **Identity & Basic Information**
   - Unique IDs, names, descriptions, and versioning
   - Documentation URLs and jurisdiction information

2. **Provider Information**
   - Provider details with optional DID-based verification
   - Trust anchoring through decentralized identifiers

3. **Network Endpoints**
   - Static API endpoints
   - Dynamic routing with geographic and load balancing policies

4. **Technical Capabilities**
   - Supported modalities (text, audio, video, image)
   - Authentication methods and required scopes
   - Streaming and batch processing support

5. **Functional Skills**
   - Detailed skill definitions with performance constraints
   - Language support and token limits
   - Input/output mode specifications

6. **Quality Metrics**
   - Performance scores and availability statistics
   - Audit trails with immutable evidence storage
   - Third-party verification records

7. **Observability & Monitoring**
   - Telemetry configuration and metrics
   - Real-time performance indicators
   - Data retention and sampling policies

8. **Trust & Verification**
   - Certification levels and issuer information
   - Validity periods for certifications

## Usage Examples

### Basic Agent Definition

```json
{
  "id": "myorg:translation-agent-v1",
  "agent_name": "urn:agent:myorg:TranslationBot",
  "label": "MultiLang Translator",
  "description": "Real-time translation service supporting 25+ languages",
  "version": "2.1.0",
  "provider": {
    "name": "MyOrg Inc.",
    "url": "https://myorg.com"
  },
  "endpoints": {
    "static": ["https://api.myorg.com/v2/translate"]
  },
  "capabilities": {
    "modalities": ["text", "audio"],
    "streaming": true,
    "authentication": {
      "methods": ["oauth2", "jwt"]
    }
  },
  "skills": [
    {
      "id": "translation",
      "description": "Real-time multilingual translation",
      "inputModes": ["text"],
      "outputModes": ["text"],
      "supportedLanguages": ["en", "es", "fr", "de"],
      "latencyBudgetMs": 500
    }
  ]
}
```

### Advanced Agent with Verification

```json
{
  "id": "enterprise:ai-assistant-pro",
  "agent_name": "urn:agent:enterprise:AssistantPro",
  "label": "Enterprise AI Assistant",
  "description": "Advanced AI assistant for enterprise workflows",
  "version": "3.0.0",
  "provider": {
    "name": "Enterprise AI Corp",
    "url": "https://enterpriseai.com",
    "did": "did:web:enterpriseai.com"
  },
  "endpoints": {
    "static": ["https://api.enterpriseai.com/v3/assistant"],
    "adaptive_resolver": {
      "url": "https://resolver.enterpriseai.com/dispatch",
      "policies": ["geo", "load", "threat-shield"]
    }
  },
  "capabilities": {
    "modalities": ["text", "audio", "image"],
    "streaming": true,
    "batch": true,
    "authentication": {
      "methods": ["oauth2", "jwt"],
      "requiredScopes": ["assistant:read", "assistant:write"]
    }
  },
  "skills": [
    {
      "id": "analysis",
      "description": "Document analysis and summarization",
      "inputModes": ["text", "image"],
      "outputModes": ["text"],
      "maxTokens": 4096
    }
  ],
  "certification": {
    "level": "audited",
    "issuer": "AI Safety Council",
    "issuanceDate": "2025-01-15T10:00:00Z",
    "expirationDate": "2026-01-15T10:00:00Z"
  },
  "evaluations": {
    "performanceScore": 4.8,
    "availability90d": "99.95%",
    "lastAudited": "2025-06-01T12:00:00Z",
    "auditTrail": "ipfs://QmX7Y8Z9abcd...",
    "auditorID": "TrustedAI Auditor v3.0"
  },
  "telemetry": {
    "enabled": true,
    "retention": "30d",
    "sampling": 0.1,
    "metrics": {
      "latency_p95_ms": 150,
      "throughput_rps": 1000,
      "error_rate": 0.001,
      "availability": "99.98%"
    }
  }
}
```

## Field Classifications

### 🟢 AgentCard Compatible
Fields that map directly to existing AgentCard specifications:
- `label` → AgentCard.name
- `description` → AgentCard.description
- `version` → AgentCard.version
- `provider` → AgentCard.provider
- `endpoints.static` → AgentCard.url
- `capabilities.modalities` → AgentCard.defaultInputModes/defaultOutputModes
- `capabilities.authentication` → AgentCard.securitySchemes & security
- `skills` → AgentCard.skills

### 🔵 Extended Features
Advanced capabilities beyond basic agent cards:
- Dynamic endpoint resolution
- Performance metrics and SLAs
- Certification and audit trails
- Real-time telemetry
- Trust verification mechanisms

## Validation

To validate an AgentFacts document against the schema:

```bash
# Using ajv-cli
npm install -g ajv-cli
ajv validate -s agentfacts-schema.json -d your-agent.json

# Using online validators
# Upload both files to https://www.jsonschemavalidator.net/
```

## Implementation Guidelines

1. **Validation**: Always validate AgentFacts documents against the JSON Schema
2. **Flexibility**: The schema allows flexible values while maintaining structure
3. **Security**: Implement proper authentication as declared in capabilities
4. **Monitoring**: Maintain telemetry data accuracy for trust building
5. **Certification**: Consider appropriate certification levels for production agents

## Contributing

This is an open standard for the agentic web ecosystem. Contributions, suggestions, and implementations are welcome through issues and pull requests.

MIT License

*Building the infrastructure for trusted, discoverable AI agents on the web.*
