import os
import json
import requests
from typing import Dict, Any, Optional
from dataclasses import dataclass, asdict

class CandlefishConfigClient:
    """
    Python SDK for Candlefish Claude Configuration System v2.0
    
    Provides a Pythonic interface for managing configuration profiles
    and interacting with the Claude Configuration System API.
    """
    
    BASE_URL = "https://api.candlefish.ai/v2.0"
    
    def __init__(self, api_key: str, tier: str = "Pro"):
        """
        Initialize the Claude Configuration Client
        
        :param api_key: Enterprise API key
        :param tier: Service tier (Free, Pro, Enterprise)
        """
        self.api_key = api_key
        self.tier = tier
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "X-Tier": tier
        }
    
    @dataclass
    class ConfigProfile:
        """
        Represents a Configuration Profile
        """
        profile_id: Optional[str] = None
        name: str = ""
        version: str = "2.0.0"
        description: Optional[str] = None
        settings: Dict[str, Any] = None
        metadata: Optional[Dict[str, Any]] = None
        
        def to_dict(self):
            return {k: v for k, v in asdict(self).items() if v is not None}
    
    def list_profiles(self) -> List[ConfigProfile]:
        """
        List all configuration profiles
        
        :return: List of ConfigProfile instances
        """
        response = requests.get(
            f"{self.BASE_URL}/config/profiles", 
            headers=self.headers
        )
        response.raise_for_status()
        return [self.ConfigProfile(**profile) for profile in response.json()]
    
    def create_profile(self, profile: ConfigProfile) -> ConfigProfile:
        """
        Create a new configuration profile
        
        :param profile: ConfigProfile to create
        :return: Created ConfigProfile with assigned profile_id
        """
        response = requests.post(
            f"{self.BASE_URL}/config/profiles",
            headers=self.headers,
            json=profile.to_dict()
        )
        response.raise_for_status()
        return self.ConfigProfile(**response.json())
    
    def get_profile(self, profile_id: str) -> ConfigProfile:
        """
        Retrieve a specific configuration profile
        
        :param profile_id: Unique profile identifier
        :return: ConfigProfile instance
        """
        response = requests.get(
            f"{self.BASE_URL}/config/profiles/{profile_id}",
            headers=self.headers
        )
        response.raise_for_status()
        return self.ConfigProfile(**response.json())
    
    def update_profile(self, profile: ConfigProfile) -> ConfigProfile:
        """
        Update an existing configuration profile
        
        :param profile: ConfigProfile with updates
        :return: Updated ConfigProfile
        """
        if not profile.profile_id:
            raise ValueError("Profile must have a profile_id for updates")
        
        response = requests.put(
            f"{self.BASE_URL}/config/profiles/{profile.profile_id}",
            headers=self.headers,
            json=profile.to_dict()
        )
        response.raise_for_status()
        return self.ConfigProfile(**response.json())

# Example Usage
if __name__ == "__main__":
    client = CandlefishConfigClient(api_key="your_api_key")
    
    # Create a new profile
    profile = client.ConfigProfile(
        name="Enterprise DevOps",
        description="Standardized configuration for DevOps teams",
        settings={
            "languages": ["python", "typescript"],
            "tools": ["poetry", "pnpm"]
        }
    )
    
    created_profile = client.create_profile(profile)
    print(f"Created Profile ID: {created_profile.profile_id}")