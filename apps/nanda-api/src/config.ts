import { z } from 'zod'

// Configuration schema
const configSchema = z.object({
  // Server configuration
  port: z.number().default(3000),
  host: z.string().default('0.0.0.0'),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // AWS configuration
  aws: z.object({
    region: z.string().default('us-east-1'),
    dynamoTable: z.string().default('nanda-index-agents'),
  }),

  // Redis configuration
  redisUrl: z.string().default('redis://localhost:6379'),

  // Authentication
  auth: z.object({
    jwksUrl: z.string().default('https://paintbox.fly.dev/.well-known/jwks.json'),
    issuer: z.string().default('https://paintbox.fly.dev'),
    audience: z.string().default('nanda-api'),
  }),

  // CORS configuration
  corsOrigins: z.array(z.string()).default(['http://localhost:3001']),

  // Rate limiting
  rateLimits: z.object({
    requests: z.number().default(100),
    window: z.number().default(60000), // 1 minute
  }),

  // Node configuration
  nodeId: z.string().default('nanda-node-1'),

  // Privacy configuration
  privacy: z.object({
    mixNodes: z.array(z.string()).default([]),
    zkPrime: z.string().default('2^521 - 1'),
  }),

  // Enterprise configuration
  enterprise: z.object({
    registries: z.array(z.string()).default([]),
    trustedRegistries: z.array(z.string()).default([]),
  }),

  // Observability
  observability: z.object({
    otlpEndpoint: z.string().default(''),
  }),
})

// Parse environment variables
const env = {
  port: process.env.PORT ? parseInt(process.env.PORT) : undefined,
  host: process.env.HOST,
  logLevel: process.env.LOG_LEVEL,

  aws: {
    region: process.env.AWS_REGION,
    dynamoTable: process.env.DYNAMO_TABLE_AGENTS,
  },

  redisUrl: process.env.REDIS_URL,

  auth: {
    jwksUrl: process.env.JWKS_URL,
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE,
  },

  corsOrigins: process.env.CORS_ORIGINS?.split(','),

  rateLimits: {
    requests: process.env.RATE_LIMIT_REQUESTS ? parseInt(process.env.RATE_LIMIT_REQUESTS) : undefined,
    window: process.env.RATE_LIMIT_WINDOW ? parseInt(process.env.RATE_LIMIT_WINDOW) : undefined,
  },

  nodeId: process.env.NODE_ID,

  privacy: {
    mixNodes: process.env.MIX_NODES?.split(','),
    zkPrime: process.env.ZK_PRIME,
  },

  enterprise: {
    registries: process.env.ENTERPRISE_REGISTRIES?.split(','),
    trustedRegistries: process.env.TRUSTED_REGISTRIES?.split(','),
  },

  observability: {
    otlpEndpoint: process.env.OTLP_ENDPOINT,
  },
}

// Filter out undefined values
const cleanEnv = Object.entries(env).reduce((acc, [key, value]) => {
  if (value !== undefined) {
    acc[key as keyof typeof env] = value
  }
  return acc
}, {} as any)

// Parse and validate configuration
export const config = configSchema.parse(cleanEnv)
