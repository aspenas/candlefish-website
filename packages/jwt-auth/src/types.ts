export interface TokenPayload {
  sub: string;
  email?: string;
  name?: string;
  role?: string;
  permissions?: string[];
  scope?: string;
  [key: string]: any;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface JWTConfig {
  secretId?: string;
  jwksUrl?: string;
  issuer?: string;
  audience?: string | string[];
  region?: string;
  expiresIn?: string | number;
  refreshExpiresIn?: string | number;
  cacheTimeout?: number;
  serviceAccount?: {
    id: string;
    key: string;
  };
}

export interface MiddlewareOptions {
  required?: boolean;
  roles?: string[];
  permissions?: string[];
  scope?: string[];
  onError?: (error: Error, req: any, res: any, next?: any) => void;
  credentialsRequired?: boolean;
}

export interface JWKSKey {
  kty: string;
  use: string;
  kid: string;
  alg: string;
  n: string;
  e: string;
  d?: string;
  p?: string;
  q?: string;
  dp?: string;
  dq?: string;
  qi?: string;
}

export interface JWKS {
  keys: JWKSKey[];
}

export interface ServiceCredentials {
  serviceId: string;
  serviceKey: string;
  scope?: string[];
}

export interface VerifyOptions {
  audience?: string | string[];
  issuer?: string | string[];
  ignoreExpiration?: boolean;
  clockTolerance?: number;
}
