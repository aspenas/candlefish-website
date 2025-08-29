import axios, { AxiosInstance } from 'axios';

export interface SecurityDashboardConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
}

export class SecurityDashboard {
  private client: AxiosInstance;

  constructor(config: SecurityDashboardConfig = {}) {
    const {
      apiKey = process.env.SECURITY_DASHBOARD_API_KEY,
      baseUrl = 'https://api.security-dashboard.io/v1',
      timeout = 10000
    } = config;

    this.client = axios.create({
      baseURL: baseUrl,
      timeout,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async login(email: string, password: string) {
    try {
      const response = await this.client.post('/auth/login', { email, password });
      return response.data;
    } catch (error) {
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  async listAssets(options: { page?: number; pageSize?: number; filter?: Record<string, unknown> } = {}) {
    const { page = 1, pageSize = 50, filter = {} } = options;
    
    try {
      const response = await this.client.get('/assets', {
        params: { page, pageSize, filter: JSON.stringify(filter) }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to list assets: ${error.message}`);
    }
  }

  async listAlerts(options: { severity?: string[]; page?: number; pageSize?: number } = {}) {
    const { severity = [], page = 1, pageSize = 50 } = options;
    
    try {
      const response = await this.client.get('/alerts', {
        params: { severity, page, pageSize }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to list alerts: ${error.message}`);
    }
  }

  async listVulnerabilities(options: { severity?: string[]; page?: number; pageSize?: number } = {}) {
    const { severity = [], page = 1, pageSize = 50 } = options;
    
    try {
      const response = await this.client.get('/vulnerabilities', {
        params: { severity, page, pageSize }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to list vulnerabilities: ${error.message}`);
    }
  }
}

export default SecurityDashboard;