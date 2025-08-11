"""Configuration management for Slack Admin Bot"""

import os
import json
import boto3
from typing import Dict, Any
from dataclasses import dataclass
from botocore.exceptions import ClientError
import structlog

logger = structlog.get_logger(__name__)


@dataclass
class SlackConfig:
    """Slack configuration container"""

    bot_token: str = None
    user_token: str = None
    app_token: str = None
    client_id: str = None
    client_secret: str = None
    signing_secret: str = None
    verification_token: str = None
    workspace_id: str = None
    workspace_name: str = "candlefish.ai"
    app_name: str = "Candlefish Admin Agent"


class ConfigManager:
    """Manages configuration from AWS Secrets Manager and environment variables"""

    def __init__(self):
        self.secrets_client = boto3.client("secretsmanager", region_name="us-west-2")
        self.config = SlackConfig()

    def load_from_secrets_manager(self, secret_name: str = "slack-admin-bot-tokens") -> SlackConfig:
        """Load configuration from AWS Secrets Manager"""
        try:
            response = self.secrets_client.get_secret_value(SecretId=secret_name)
            secrets = json.loads(response["SecretString"])

            self.config.bot_token = secrets.get("bot_token")
            self.config.user_token = secrets.get("user_token")
            self.config.app_token = secrets.get("app_token")
            self.config.client_id = secrets.get("client_id")
            self.config.client_secret = secrets.get("client_secret")
            self.config.signing_secret = secrets.get("signing_secret")
            self.config.verification_token = secrets.get("verification_token")
            self.config.workspace_id = secrets.get("workspace_id")
            self.config.workspace_name = secrets.get("workspace_name", "candlefish.ai")
            self.config.app_name = secrets.get("app_name", "Candlefish Admin Agent")

            logger.info("Successfully loaded configuration from AWS Secrets Manager")
            return self.config

        except ClientError as e:
            logger.error("Failed to load from Secrets Manager", error=str(e))
            return self._load_from_environment()

    def _load_from_environment(self) -> SlackConfig:
        """Fallback to environment variables"""
        self.config.bot_token = os.getenv("SLACK_BOT_TOKEN")
        self.config.user_token = os.getenv("SLACK_USER_TOKEN")
        self.config.app_token = os.getenv("SLACK_APP_TOKEN")
        self.config.client_id = os.getenv("SLACK_CLIENT_ID")
        self.config.client_secret = os.getenv("SLACK_CLIENT_SECRET")
        self.config.signing_secret = os.getenv("SLACK_SIGNING_SECRET")
        self.config.verification_token = os.getenv("SLACK_VERIFICATION_TOKEN")
        self.config.workspace_id = os.getenv("SLACK_WORKSPACE_ID")
        self.config.workspace_name = os.getenv("SLACK_WORKSPACE_NAME", "candlefish.ai")

        logger.info("Loaded configuration from environment variables")
        return self.config

    def store_in_secrets_manager(
        self, tokens: Dict[str, Any], secret_name: str = "slack-admin-bot-tokens"
    ):
        """Store tokens in AWS Secrets Manager"""
        try:
            secret_data = {
                "bot_token": tokens.get("bot_token"),
                "user_token": tokens.get("user_token"),
                "app_token": tokens.get("app_token"),
                "client_id": tokens.get("client_id"),
                "client_secret": tokens.get("client_secret"),
                "signing_secret": tokens.get("signing_secret"),
                "verification_token": tokens.get("verification_token"),
                "workspace_id": tokens.get("workspace_id"),
                "workspace_name": "candlefish.ai",
                "permissions": "admin",
                "created_date": "2025-08-08",
                "app_name": "Candlefish Admin Agent",
            }

            # Try to create new secret
            try:
                self.secrets_client.create_secret(
                    Name=secret_name,
                    Description="Slack Admin Bot with full workspace permissions for autonomous agent",
                    SecretString=json.dumps(secret_data),
                )
                logger.info("Successfully created new secret in AWS Secrets Manager")
            except ClientError as e:
                if e.response["Error"]["Code"] == "ResourceExistsException":
                    # Update existing secret
                    self.secrets_client.update_secret(
                        SecretId=secret_name, SecretString=json.dumps(secret_data)
                    )
                    logger.info("Successfully updated existing secret in AWS Secrets Manager")
                else:
                    raise e

        except ClientError as e:
            logger.error("Failed to store in Secrets Manager", error=str(e))
            raise e

    def get_primary_token(self) -> str:
        """Get the primary token for API calls (bot token preferred, fallback to user token)"""
        if self.config.bot_token:
            return self.config.bot_token
        elif self.config.user_token:
            return self.config.user_token
        else:
            raise ValueError("No valid Slack token found")

    def has_socket_mode_support(self) -> bool:
        """Check if Socket Mode is available"""
        return bool(self.config.app_token)


# Global config instance
config_manager = ConfigManager()
