import os
import requests
from typing import Dict, List, Optional

class SecurityDashboard:
    def __init__(
        self, 
        api_key: Optional[str] = None, 
        base_url: str = 'https://api.security-dashboard.io/v1',
        timeout: int = 10
    ):
        self.api_key = api_key or os.getenv('SECURITY_DASHBOARD_API_KEY')
        if not self.api_key:
            raise ValueError("API key is required. Set SECURITY_DASHBOARD_API_KEY environment variable.")
        
        self.base_url = base_url
        self.timeout = timeout
        self.headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }

    def _request(self, method: str, endpoint: str, params: Optional[Dict] = None, data: Optional[Dict] = None):
        url = f"{self.base_url}{endpoint}"
        try:
            response = requests.request(
                method, 
                url, 
                headers=self.headers, 
                params=params, 
                json=data,
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise RuntimeError(f"API request failed: {e}")

    def login(self, email: str, password: str) -> Dict:
        """Authenticate user and obtain access token."""
        data = {'email': email, 'password': password}
        return self._request('POST', '/auth/login', data=data)

    def list_assets(
        self, 
        page: int = 1, 
        page_size: int = 50, 
        filter_params: Optional[Dict] = None
    ) -> Dict:
        """Retrieve list of monitored assets."""
        params = {
            'page': page,
            'pageSize': page_size,
            'filter': filter_params or {}
        }
        return self._request('GET', '/assets', params=params)

    def list_alerts(
        self, 
        severity: Optional[List[str]] = None, 
        page: int = 1, 
        page_size: int = 50
    ) -> Dict:
        """Retrieve security alerts."""
        params = {
            'page': page,
            'pageSize': page_size,
            'severity': severity or []
        }
        return self._request('GET', '/alerts', params=params)

    def list_vulnerabilities(
        self, 
        severity: Optional[List[str]] = None, 
        page: int = 1, 
        page_size: int = 50
    ) -> Dict:
        """Retrieve vulnerabilities."""
        params = {
            'page': page,
            'pageSize': page_size,
            'severity': severity or []
        }
        return self._request('GET', '/vulnerabilities', params=params)

    def acknowledge_alert(self, alert_id: str, comment: Optional[str] = None) -> Dict:
        """Acknowledge a specific security alert."""
        data = {
            'alertId': alert_id,
            'comment': comment or ''
        }
        return self._request('POST', '/alerts/acknowledge', data=data)