// Lambda: RS256 Public Key Service
// Returns the current public key PEM and keyId from AWS Secrets Manager
// Secret schema: { keyId, publicKey, privateKey, createdAt }

const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");

const REGION = process.env.AWS_REGION || "us-east-1";
const ENV = process.env.CF_ENV || process.env.NODE_ENV || "production";
const SECRET_NAME = process.env.JWT_SECRET_NAME || `candlefish-jwt-keys-${ENV}`;

const sm = new SecretsManagerClient({ region: REGION });

exports.handler = async (event) => {
  try {
    if (event.requestContext?.http?.method !== "GET") {
      return response(405, { error: "Method not allowed" });
    }

    const secret = await sm.send(new GetSecretValueCommand({ SecretId: SECRET_NAME }));
    const data = JSON.parse(secret.SecretString || "{}");
    if (!data.keyId || !data.publicKey) {
      return response(500, { error: "Invalid key secret schema" });
    }

    const body = {
      kid: data.keyId,
      publicKeyPem: data.publicKey,
      createdAt: data.createdAt,
    };

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
        "X-Content-Type-Options": "nosniff",
      },
      body: JSON.stringify(body),
    };
  } catch (err) {
    console.error("Key service error", { message: err?.message, code: err?.name });
    return response(500, { error: "Internal server error" });
  }
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
      "X-Content-Type-Options": "nosniff",
    },
    body: JSON.stringify(body),
  };
}


