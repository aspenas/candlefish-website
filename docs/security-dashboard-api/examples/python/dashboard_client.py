import requests
import websockets
import asyncio
import jwt

class SecurityDashboardClient:
    def __init__(self, base_url, jwt_token):
        self.base_url = base_url
        self.jwt_token = jwt_token
        self.headers = {'Authorization': f'Bearer {jwt_token}'}

    def get_dashboard_overview(self):
        """Retrieve security dashboard overview."""
        response = requests.get(
            f'{self.base_url}/api/dashboard/overview', 
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()

    async def listen_for_alerts(self):
        """Listen for live security alerts via WebSocket."""
        uri = f'wss://{self.base_url.replace("https://", "")}/ws'
        async with websockets.connect(
            uri, 
            extra_headers={'Authorization': f'Bearer {self.jwt_token}'}
        ) as websocket:
            while True:
                try:
                    message = await websocket.recv()
                    alert = json.loads(message)
                    self._process_alert(alert)
                except websockets.ConnectionClosed:
                    break

    def _process_alert(self, alert):
        """Process incoming security alerts."""
        if alert['event'] == 'security.alert.new':
            print(f"New Alert: {alert['data']['type']} - Severity: {alert['data']['severity']}")

# Example usage
def main():
    base_url = 'https://api.candlefish.ai/v1'
    jwt_token = login('user@candlefish.ai', 'password')
    
    client = SecurityDashboardClient(base_url, jwt_token)
    overview = client.get_dashboard_overview()
    print(overview)

    asyncio.run(client.listen_for_alerts())

def login(email, password):
    """Authenticate and retrieve JWT token."""
    response = requests.post(
        f'{base_url}/auth/login', 
        json={'email': email, 'password': password}
    )
    response.raise_for_status()
    return response.json()['token']

if __name__ == '__main__':
    main()