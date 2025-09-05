/**
 * Simple Vault HTTP Client for Candlefish AI
 * Operational Design Atelier - Direct API Integration
 */

interface VaultSecret {
  data: {
    data: Record<string, any>;
    metadata: {
      created_time: string;
      custom_metadata: Record<string, any> | null;
      deletion_time: string;
      destroyed: boolean;
      version: number;
    };
  };
}

interface VaultListResponse {
  data: {
    keys: string[];
  };
}

export class VaultClient {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string = 'http://localhost:8201', token: string = 'candlefish-dev-token') {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.token = token;
  }

  /**
   * Get a secret from Vault
   */
  async getSecret<T = any>(path: string): Promise<T> {
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    const url = `${this.baseUrl}/v1/secret/data/${cleanPath}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Vault-Token': this.token,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Vault API error: ${response.status} ${response.statusText}`);
      }

      const result: VaultSecret = await response.json();
      return result.data.data as T;
    } catch (error) {
      throw new Error(`Failed to get secret ${path}: ${error.message}`);
    }
  }

  /**
   * Put a secret to Vault
   */
  async putSecret(path: string, data: Record<string, any>): Promise<void> {
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    const url = `${this.baseUrl}/v1/secret/data/${cleanPath}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-Vault-Token': this.token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data }),
      });

      if (!response.ok) {
        throw new Error(`Vault API error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      throw new Error(`Failed to put secret ${path}: ${error.message}`);
    }
  }

  /**
   * List secrets in a path
   */
  async listSecrets(path: string = ''): Promise<string[]> {
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    const basePath = cleanPath ? `${cleanPath}/` : '';
    const url = `${this.baseUrl}/v1/secret/metadata/${basePath}`;

    try {
      const response = await fetch(url, {
        method: 'LIST',
        headers: {
          'X-Vault-Token': this.token,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return []; // Path doesn't exist or no secrets
        }
        throw new Error(`Vault API error: ${response.status} ${response.statusText}`);
      }

      const result: VaultListResponse = await response.json();
      return result.data.keys || [];
    } catch (error) {
      throw new Error(`Failed to list secrets at ${path}: ${error.message}`);
    }
  }

  /**
   * Delete a secret from Vault
   */
  async deleteSecret(path: string): Promise<void> {
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    const url = `${this.baseUrl}/v1/secret/metadata/${cleanPath}`;

    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'X-Vault-Token': this.token,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Vault API error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      throw new Error(`Failed to delete secret ${path}: ${error.message}`);
    }
  }

  /**
   * Check Vault health
   */
  async health(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/sys/health`, {
        method: 'GET',
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

// Default instance with local configuration
export const vault = new VaultClient(
  process.env.VAULT_ADDR || 'http://localhost:8201',
  process.env.VAULT_TOKEN || 'candlefish-dev-token'
);

// Convenience functions
export async function getSecret<T = any>(path: string): Promise<T> {
  return vault.getSecret<T>(path);
}

export async function putSecret(path: string, data: Record<string, any>): Promise<void> {
  return vault.putSecret(path, data);
}

export async function listSecrets(path?: string): Promise<string[]> {
  return vault.listSecrets(path);
}

export async function deleteSecret(path: string): Promise<void> {
  return vault.deleteSecret(path);
}