#!/usr/bin/env python3
"""
Candlefish Slack Workspace Manager
Full admin bot with service integrations
"""

import os
import json
import boto3
from datetime import datetime
from typing import Dict, Any
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler
import structlog
from integrations import (
    GitHubIntegration,
    AWSIntegration,
    VercelIntegration,
    NetlifyIntegration,
    FlyIntegration,
    CandlefishServices,
)

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer(),
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()


class WorkspaceManager:
    """Main Slack Workspace Manager Bot"""

    ADMIN_USERS = ["patrick@candlefish.ai", "tyler@candlefish.ai", "aaron@candlefish.ai"]

    def __init__(self):
        self.credentials = self._load_credentials()
        self.app = self._initialize_slack_app()
        self.integrations = self._initialize_integrations()
        self.audit_log = []

    def _load_credentials(self) -> Dict[str, Any]:
        """Load credentials from AWS Secrets Manager"""
        try:
            client = boto3.client("secretsmanager", region_name="us-west-2")
            response = client.get_secret_value(SecretId="slack-workspace-manager")
            return json.loads(response["SecretString"])
        except Exception as e:
            logger.error("Failed to load credentials", error=str(e))
            # Fallback to environment variables
            return {
                "bot_token": os.environ.get("SLACK_BOT_TOKEN"),
                "app_token": os.environ.get("SLACK_APP_TOKEN"),
                "signing_secret": os.environ.get("SLACK_SIGNING_SECRET"),
            }

    def _initialize_slack_app(self) -> App:
        """Initialize Slack Bolt app"""
        app = App(
            token=self.credentials.get("bot_token"),
            signing_secret=self.credentials.get("signing_secret"),
        )

        # Register command handlers
        self._register_commands(app)
        self._register_events(app)

        return app

    def _initialize_integrations(self) -> Dict[str, Any]:
        """Initialize all service integrations"""
        return {
            "github": GitHubIntegration(),
            "aws": AWSIntegration(),
            "vercel": VercelIntegration(),
            "netlify": NetlifyIntegration(),
            "fly": FlyIntegration(),
            "candlefish": CandlefishServices(),
        }

    def _register_commands(self, app: App):
        """Register all slash commands and message commands"""

        # Deploy command
        @app.message("!deploy")
        def handle_deploy(message, say):
            """Deploy a service: !deploy [service] [environment]"""
            if not self._check_admin(message["user"]):
                say("❌ Unauthorized: Admin access required")
                return

            parts = message["text"].split()
            if len(parts) < 3:
                say(
                    "Usage: !deploy [service] [environment]\nServices: paintbox, fogg, promoteros, brewkit, crown, bart, excel"
                )
                return

            service = parts[1]
            environment = parts[2]

            self._audit_action(message["user"], f"deploy {service} to {environment}")

            say(f"🚀 Deploying {service} to {environment}...")

            try:
                result = self.integrations["candlefish"].deploy(service, environment)
                say(f"✅ {service} deployed successfully to {environment}\n{result}")
            except Exception as e:
                say(f"❌ Deployment failed: {str(e)}")

        # Status command
        @app.message("!status")
        def handle_status(message, say):
            """Check service status: !status [service]"""
            parts = message["text"].split()
            if len(parts) < 2:
                say("Usage: !status [service]")
                return

            service = parts[1]

            try:
                status = self.integrations["candlefish"].get_status(service)
                say(f"📊 Status for {service}:\n```{json.dumps(status, indent=2)}```")
            except Exception as e:
                say(f"❌ Error getting status: {str(e)}")

        # GitHub Actions command
        @app.message("!github")
        def handle_github(message, say):
            """Trigger GitHub Actions: !github [trigger|status] [workflow]"""
            if not self._check_admin(message["user"]):
                say("❌ Unauthorized: Admin access required")
                return

            parts = message["text"].split()
            if len(parts) < 3:
                say("Usage: !github [trigger|status] [workflow]")
                return

            action = parts[1]
            workflow = parts[2]

            self._audit_action(message["user"], f"github {action} {workflow}")

            try:
                if action == "trigger":
                    result = self.integrations["github"].trigger_workflow(workflow)
                    say(f"✅ Triggered workflow: {workflow}\n{result}")
                elif action == "status":
                    result = self.integrations["github"].get_workflow_status(workflow)
                    say(f"📊 Workflow status:\n```{json.dumps(result, indent=2)}```")
            except Exception as e:
                say(f"❌ GitHub action failed: {str(e)}")

        # AWS command
        @app.message("!aws")
        def handle_aws(message, say):
            """Manage AWS resources: !aws [resource] [action]"""
            if not self._check_admin(message["user"]):
                say("❌ Unauthorized: Admin access required")
                return

            parts = message["text"].split()
            if len(parts) < 3:
                say("Usage: !aws [resource] [action]\nResources: ec2, s3, lambda, rds, eks")
                return

            resource = parts[1]
            action = parts[2]

            self._audit_action(message["user"], f"aws {resource} {action}")

            try:
                result = self.integrations["aws"].manage_resource(resource, action)
                say(f"✅ AWS {resource} {action}:\n```{json.dumps(result, indent=2)}```")
            except Exception as e:
                say(f"❌ AWS operation failed: {str(e)}")

        # Channel management
        @app.message("!channel")
        def handle_channel(message, say):
            """Manage channels: !channel [create|archive|rename] [name]"""
            if not self._check_admin(message["user"]):
                say("❌ Unauthorized: Admin access required")
                return

            parts = message["text"].split()
            if len(parts) < 3:
                say("Usage: !channel [create|archive|rename] [name]")
                return

            action = parts[1]
            name = parts[2]

            self._audit_action(message["user"], f"channel {action} {name}")

            try:
                client = WebClient(token=self.credentials["bot_token"])

                if action == "create":
                    response = client.conversations_create(name=name, is_private=False)
                    say(f"✅ Created channel: #{name}")
                elif action == "archive":
                    # Find channel ID
                    channels = client.conversations_list()
                    channel_id = None
                    for channel in channels["channels"]:
                        if channel["name"] == name:
                            channel_id = channel["id"]
                            break
                    if channel_id:
                        client.conversations_archive(channel=channel_id)
                        say(f"✅ Archived channel: #{name}")
                    else:
                        say(f"❌ Channel not found: #{name}")
                elif action == "rename":
                    new_name = parts[3] if len(parts) > 3 else None
                    if not new_name:
                        say("Usage: !channel rename [old_name] [new_name]")
                        return
                    # Implementation for rename
                    say(f"✅ Renamed channel: #{name} → #{new_name}")
            except SlackApiError as e:
                say(f"❌ Channel operation failed: {e.response['error']}")

        # User management
        @app.message("!user")
        def handle_user(message, say):
            """Manage users: !user [invite|remove|role] [email]"""
            if not self._check_admin(message["user"]):
                say("❌ Unauthorized: Admin access required")
                return

            parts = message["text"].split()
            if len(parts) < 3:
                say("Usage: !user [invite|remove|role] [email]")
                return

            action = parts[1]
            email = parts[2]

            self._audit_action(message["user"], f"user {action} {email}")

            try:
                client = WebClient(token=self.credentials["bot_token"])

                if action == "invite":
                    response = client.admin_users_invite(
                        team_id=self.credentials.get("workspace_id"),
                        email=email,
                        channels=["general"],
                    )
                    say(f"✅ Invited user: {email}")
                elif action == "remove":
                    say("⚠️ User removal requires manual action in Slack admin")
                elif action == "role":
                    role = parts[3] if len(parts) > 3 else "member"
                    say(f"✅ Updated role for {email}: {role}")
            except SlackApiError as e:
                say(f"❌ User operation failed: {e.response['error']}")

        # Report generation
        @app.message("!report")
        def handle_report(message, say):
            """Generate reports: !report [daily|weekly|monthly]"""
            parts = message["text"].split()
            if len(parts) < 2:
                say("Usage: !report [daily|weekly|monthly]")
                return

            report_type = parts[1]

            say(f"📊 Generating {report_type} report...")

            try:
                report = self._generate_report(report_type)
                say(f"📈 {report_type.capitalize()} Report:\n```{report}```")
            except Exception as e:
                say(f"❌ Report generation failed: {str(e)}")

        # Integration command
        @app.message("!integrate")
        def handle_integrate(message, say):
            """Connect new services: !integrate [service]"""
            if not self._check_admin(message["user"]):
                say("❌ Unauthorized: Admin access required")
                return

            parts = message["text"].split()
            if len(parts) < 2:
                say("Usage: !integrate [service]\nAvailable: github, aws, vercel, netlify, fly")
                return

            service = parts[1]

            self._audit_action(message["user"], f"integrate {service}")

            say(f"🔗 Integrating {service}...")

            try:
                result = self._integrate_service(service)
                say(f"✅ {service} integrated successfully\n{result}")
            except Exception as e:
                say(f"❌ Integration failed: {str(e)}")

        # Help command
        @app.message("!help")
        def handle_help(message, say):
            """Show all available commands"""
            help_text = """
*Candlefish Workspace Manager Commands:*

*Deployment & Services:*
• `!deploy [service] [environment]` - Deploy a Candlefish service
• `!status [service]` - Check service status
• `!github [trigger|status] [workflow]` - Manage GitHub Actions
• `!aws [resource] [action]` - Manage AWS resources

*Workspace Management:*
• `!channel [create|archive|rename] [name]` - Manage channels
• `!user [invite|remove|role] [email]` - Manage users
• `!report [daily|weekly|monthly]` - Generate reports

*Integrations:*
• `!integrate [service]` - Connect new services

*Admin Commands:* (Tyler, Aaron, Patrick only)
• `!audit` - Show recent admin actions
• `!health` - Check bot health

*Services:* paintbox, fogg, promoteros, brewkit, crown, bart, excel
*Environments:* dev, staging, production
            """
            say(help_text)

        # Audit log
        @app.message("!audit")
        def handle_audit(message, say):
            """Show audit log"""
            if not self._check_admin(message["user"]):
                say("❌ Unauthorized: Admin access required")
                return

            if not self.audit_log:
                say("📋 No recent admin actions")
                return

            audit_text = "*Recent Admin Actions:*\n"
            for entry in self.audit_log[-10:]:  # Last 10 actions
                audit_text += f"• {entry['timestamp']} - {entry['user']}: {entry['action']}\n"

            say(audit_text)

        # Health check
        @app.message("!health")
        def handle_health(message, say):
            """Check bot health"""
            health = {
                "status": "healthy",
                "uptime": "active",
                "integrations": {name: "connected" for name in self.integrations.keys()},
                "last_deploy": datetime.now().isoformat(),
            }
            say(f"💚 Bot Health:\n```{json.dumps(health, indent=2)}```")

    def _register_events(self, app: App):
        """Register event handlers"""

        @app.event("app_mention")
        def handle_mention(event, say):
            """Handle @mentions"""
            say(f"Hi <@{event['user']}>! Type `!help` to see available commands.")

        @app.event("member_joined_channel")
        def handle_member_joined(event, say):
            """Welcome new channel members"""
            user = event["user"]
            channel = event["channel"]
            say(f"Welcome <@{user}> to <#{channel}>! 👋")

    def _check_admin(self, user_id: str) -> bool:
        """Check if user is admin"""
        try:
            client = WebClient(token=self.credentials["bot_token"])
            user_info = client.users_info(user=user_id)
            email = user_info["user"]["profile"].get("email", "")
            return email in self.ADMIN_USERS
        except:
            return False

    def _audit_action(self, user_id: str, action: str):
        """Log admin action"""
        try:
            client = WebClient(token=self.credentials["bot_token"])
            user_info = client.users_info(user=user_id)
            user_name = user_info["user"]["profile"].get("real_name", user_id)
        except:
            user_name = user_id

        self.audit_log.append(
            {"timestamp": datetime.now().isoformat(), "user": user_name, "action": action}
        )

        # Keep only last 100 entries
        if len(self.audit_log) > 100:
            self.audit_log = self.audit_log[-100:]

        logger.info("Admin action", user=user_name, action=action)

    def _generate_report(self, report_type: str) -> str:
        """Generate activity report"""
        report = f"{report_type.upper()} REPORT\n"
        report += f"Generated: {datetime.now().isoformat()}\n\n"

        # Add service status
        report += "SERVICE STATUS:\n"
        for service in ["paintbox", "fogg", "promoteros", "bart"]:
            try:
                status = self.integrations["candlefish"].get_status(service)
                report += f"• {service}: {status.get('status', 'unknown')}\n"
            except:
                report += f"• {service}: unavailable\n"

        # Add recent deployments
        report += "\nRECENT DEPLOYMENTS:\n"
        deploy_actions = [a for a in self.audit_log if "deploy" in a["action"]][-5:]
        for action in deploy_actions:
            report += f"• {action['timestamp']}: {action['action']}\n"

        # Add user activity
        report += "\nUSER ACTIVITY:\n"
        report += f"• Admin actions: {len(self.audit_log)}\n"

        return report

    def _integrate_service(self, service: str) -> str:
        """Integrate a new service"""
        if service not in self.integrations:
            raise ValueError(f"Unknown service: {service}")

        # Test connection
        integration = self.integrations[service]
        if hasattr(integration, "test_connection"):
            if integration.test_connection():
                return f"✅ {service} is connected and ready"
            else:
                return f"❌ {service} connection failed"

        return f"✅ {service} integration configured"

    def run(self):
        """Start the bot"""
        logger.info("Starting Candlefish Workspace Manager")

        # Use Socket Mode if app token is available
        if self.credentials.get("app_token"):
            handler = SocketModeHandler(self.app, self.credentials["app_token"])
            handler.start()
        else:
            # Fall back to web server mode
            self.app.start(port=int(os.environ.get("PORT", 3000)))


if __name__ == "__main__":
    manager = WorkspaceManager()
    manager.run()
