const axios = require('axios');
const WebSocket = require('ws');

class SecurityDashboardClient {
    constructor(baseUrl, jwtToken) {
        this.baseUrl = baseUrl;
        this.jwtToken = jwtToken;
        this.headers = { 
            Authorization: `Bearer ${jwtToken}`,
            'Content-Type': 'application/json'
        };
    }

    async getDashboardOverview() {
        try {
            const response = await axios.get(
                `${this.baseUrl}/api/dashboard/overview`, 
                { headers: this.headers }
            );
            return response.data;
        } catch (error) {
            console.error('Failed to fetch dashboard overview:', error);
            throw error;
        }
    }

    async createIncident(incidentData) {
        try {
            const response = await axios.post(
                `${this.baseUrl}/api/incidents`, 
                incidentData,
                { headers: this.headers }
            );
            return response.data;
        } catch (error) {
            console.error('Failed to create incident:', error);
            throw error;
        }
    }

    connectWebSocket() {
        const wsUrl = this.baseUrl.replace('https://', 'wss://') + '/ws';
        const ws = new WebSocket(wsUrl, {
            headers: { Authorization: `Bearer ${this.jwtToken}` }
        });

        ws.on('open', () => {
            console.log('WebSocket connection established');
        });

        ws.on('message', (data) => {
            const event = JSON.parse(data);
            this.processEvent(event);
        });

        ws.on('close', () => {
            console.log('WebSocket connection closed');
        });

        return ws;
    }

    processEvent(event) {
        switch (event.event) {
            case 'security.alert.new':
                console.log('New Security Alert:', event.data);
                break;
            case 'security.incident.update':
                console.log('Incident Update:', event.data);
                break;
            case 'security.threat.detected':
                console.log('Threat Detected:', event.data);
                break;
        }
    }

    static async login(baseUrl, email, password) {
        try {
            const response = await axios.post(`${baseUrl}/auth/login`, {
                email,
                password
            });
            return response.data.token;
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    }
}

// Example usage
async function main() {
    const BASE_URL = 'https://api.candlefish.ai/v1';
    
    try {
        const jwtToken = await SecurityDashboardClient.login(
            BASE_URL, 
            'user@candlefish.ai', 
            'password'
        );

        const client = new SecurityDashboardClient(BASE_URL, jwtToken);

        // Get dashboard overview
        const overview = await client.getDashboardOverview();
        console.log('Dashboard Overview:', overview);

        // Create an incident
        const newIncident = await client.createIncident({
            type: 'network_intrusion',
            severity: 'high',
            status: 'open'
        });
        console.log('Created Incident:', newIncident);

        // Connect to WebSocket for real-time events
        const ws = client.connectWebSocket();

    } catch (error) {
        console.error('Error:', error);
    }
}

main();