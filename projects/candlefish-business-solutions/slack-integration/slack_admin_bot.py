#!/usr/bin/env python3
"""
Candlefish Slack Admin Bot - Full Administrative Control
Maximum privileges autonomous agent for Slack workspace management
"""

import json
import asyncio
import signal
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from datetime import datetime

import structlog
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
from slack_sdk.socket_mode import SocketModeClient
from slack_sdk.socket_mode.request import SocketModeRequest
from slack_sdk.socket_mode.response import SocketModeResponse

from config import config_manager

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

logger = structlog.get_logger(__name__)


@dataclass
class AdminAction:
    """Represents an admin action taken by the bot"""

    action_type: str
    target: str
    user_id: str
    timestamp: datetime
    details: Dict[str, Any]
    success: bool
    error_message: Optional[str] = None


class SlackAdminBot:
    """Full-featured Slack admin bot with maximum privileges"""

    def __init__(self):
        self.config = config_manager.load_from_secrets_manager()
        self.web_client = None
        self.socket_client = None
        self.running = False
        self.admin_actions: List[AdminAction] = []

        self._initialize_clients()

    def _initialize_clients(self):
        """Initialize Slack clients"""
        try:
            # Get primary token (user token in this case)
            primary_token = config_manager.get_primary_token()

            self.web_client = WebClient(token=primary_token)

            # Test authentication
            auth_response = self.web_client.auth_test()
            logger.info(
                "Successfully authenticated with Slack",
                user=auth_response.get("user"),
                team=auth_response.get("team"),
            )

            # Initialize Socket Mode if app token is available
            if config_manager.has_socket_mode_support():
                self.socket_client = SocketModeClient(
                    app_token=self.config.app_token, web_client=self.web_client
                )
                logger.info("Socket Mode client initialized")
            else:
                logger.warning("No app token found - Socket Mode disabled")

        except Exception as e:
            logger.error("Failed to initialize Slack clients", error=str(e))
            raise e

    async def start(self):
        """Start the bot and all services"""
        logger.info("Starting Candlefish Slack Admin Bot")
        self.running = True

        try:
            # Set up signal handlers for graceful shutdown
            signal.signal(signal.SIGINT, self._signal_handler)
            signal.signal(signal.SIGTERM, self._signal_handler)

            # Start Socket Mode if available
            if self.socket_client:
                await self._setup_socket_mode_handlers()
                logger.info("Socket Mode handlers configured")

            # Run admin capabilities check
            await self._verify_admin_capabilities()

            # Start main event loop
            if self.socket_client:
                await self.socket_client.connect()
                logger.info("Bot is now running with Socket Mode")
                while self.running:
                    await asyncio.sleep(1)
            else:
                logger.info("Bot is now running without Socket Mode (polling mode)")
                await self._polling_mode()

        except Exception as e:
            logger.error("Error starting bot", error=str(e))
            raise e

    async def _setup_socket_mode_handlers(self):
        """Setup Socket Mode event handlers"""

        @self.socket_client.socket_mode_request_listeners.append
        async def handle_socket_mode_request(client: SocketModeClient, req: SocketModeRequest):
            """Handle all Socket Mode requests"""
            try:
                if req.type == "events_api":
                    # Acknowledge the request
                    response = SocketModeResponse(envelope_id=req.envelope_id)
                    await client.send_socket_mode_response(response)

                    # Process the event
                    await self._handle_event(req.payload)

                elif req.type == "slash_commands":
                    # Handle slash commands
                    await self._handle_slash_command(client, req)

            except Exception as e:
                logger.error("Error handling Socket Mode request", error=str(e))

    async def _handle_event(self, event_payload: Dict[str, Any]):
        """Handle incoming Slack events"""
        event = event_payload.get("event", {})
        event_type = event.get("type")

        logger.info("Processing event", event_type=event_type)

        # Route to specific handlers
        handlers = {
            "message": self._handle_message_event,
            "channel_created": self._handle_channel_created,
            "channel_deleted": self._handle_channel_deleted,
            "member_joined_channel": self._handle_member_joined,
            "member_left_channel": self._handle_member_left,
            "user_change": self._handle_user_change,
            "team_join": self._handle_team_join,
            "app_mention": self._handle_app_mention,
        }

        handler = handlers.get(event_type)
        if handler:
            try:
                await handler(event)
            except Exception as e:
                logger.error("Error handling event", event_type=event_type, error=str(e))

    async def _handle_message_event(self, event: Dict[str, Any]):
        """Handle message events"""
        channel = event.get("channel")
        user = event.get("user")
        text = event.get("text", "")

        # Check for admin commands in messages
        if text.startswith("!admin"):
            await self._process_admin_command(channel, user, text)

    async def _handle_app_mention(self, event: Dict[str, Any]):
        """Handle app mentions - respond with admin capabilities"""
        channel = event.get("channel")
        user = event.get("user")
        text = event.get("text", "")

        if "help" in text.lower() or "capabilities" in text.lower():
            await self._send_admin_help(channel)
        elif "status" in text.lower():
            await self._send_bot_status(channel)

    async def _process_admin_command(self, channel: str, user: str, command: str):
        """Process admin commands"""
        parts = command.split()
        if len(parts) < 2:
            return

        action = parts[1].lower()

        admin_commands = {
            "create_channel": self._admin_create_channel,
            "delete_channel": self._admin_delete_channel,
            "invite_user": self._admin_invite_user,
            "remove_user": self._admin_remove_user,
            "post_message": self._admin_post_message,
            "list_channels": self._admin_list_channels,
            "list_users": self._admin_list_users,
            "workspace_info": self._admin_workspace_info,
            "analytics": self._admin_get_analytics,
        }

        handler = admin_commands.get(action)
        if handler:
            try:
                await handler(channel, user, parts[2:])
            except Exception as e:
                await self._send_error_message(channel, f"Error executing {action}: {str(e)}")

    # Admin Action Implementations
    async def _admin_create_channel(self, channel: str, user: str, args: List[str]):
        """Create a new channel"""
        if not args:
            await self._send_error_message(
                channel, "Usage: !admin create_channel <channel_name> [private]"
            )
            return

        channel_name = args[0]
        is_private = len(args) > 1 and args[1].lower() == "private"

        try:
            response = self.web_client.conversations_create(
                name=channel_name, is_private=is_private
            )

            new_channel = response["channel"]
            await self._send_success_message(
                channel,
                f"✅ Created {'private' if is_private else 'public'} channel: #{new_channel['name']}",
            )

            self._log_admin_action(
                "create_channel",
                channel_name,
                user,
                {"channel_id": new_channel["id"], "is_private": is_private},
                True,
            )

        except SlackApiError as e:
            error_msg = f"Failed to create channel: {e.response['error']}"
            await self._send_error_message(channel, error_msg)
            self._log_admin_action(
                "create_channel", channel_name, user, {"error": e.response["error"]}, False
            )

    async def _admin_delete_channel(self, channel: str, user: str, args: List[str]):
        """Delete a channel"""
        if not args:
            await self._send_error_message(channel, "Usage: !admin delete_channel <channel_name>")
            return

        target_channel = args[0]

        try:
            # Get channel ID
            channels = self.web_client.conversations_list()["channels"]
            channel_id = None
            for ch in channels:
                if ch["name"] == target_channel or ch["id"] == target_channel:
                    channel_id = ch["id"]
                    break

            if not channel_id:
                await self._send_error_message(channel, f"Channel not found: {target_channel}")
                return

            # Archive the channel (Slack doesn't allow deletion, only archiving)
            self.web_client.conversations_archive(channel=channel_id)

            await self._send_success_message(channel, f"✅ Archived channel: #{target_channel}")
            self._log_admin_action(
                "archive_channel", target_channel, user, {"channel_id": channel_id}, True
            )

        except SlackApiError as e:
            error_msg = f"Failed to archive channel: {e.response['error']}"
            await self._send_error_message(channel, error_msg)
            self._log_admin_action(
                "archive_channel", target_channel, user, {"error": e.response["error"]}, False
            )

    async def _admin_invite_user(self, channel: str, user: str, args: List[str]):
        """Invite user to a channel"""
        if len(args) < 2:
            await self._send_error_message(
                channel, "Usage: !admin invite_user <user_id> <channel_name>"
            )
            return

        target_user = args[0]
        target_channel = args[1]

        try:
            # Get channel ID
            channels = self.web_client.conversations_list()["channels"]
            channel_id = None
            for ch in channels:
                if ch["name"] == target_channel or ch["id"] == target_channel:
                    channel_id = ch["id"]
                    break

            if not channel_id:
                await self._send_error_message(channel, f"Channel not found: {target_channel}")
                return

            self.web_client.conversations_invite(channel=channel_id, users=target_user)

            await self._send_success_message(
                channel, f"✅ Invited <@{target_user}> to #{target_channel}"
            )
            self._log_admin_action(
                "invite_user",
                target_user,
                user,
                {"channel_id": channel_id, "channel_name": target_channel},
                True,
            )

        except SlackApiError as e:
            error_msg = f"Failed to invite user: {e.response['error']}"
            await self._send_error_message(channel, error_msg)
            self._log_admin_action(
                "invite_user", target_user, user, {"error": e.response["error"]}, False
            )

    async def _admin_list_channels(self, channel: str, user: str, args: List[str]):
        """List all channels"""
        try:
            channels = self.web_client.conversations_list()["channels"]
            public_channels = [ch for ch in channels if not ch.get("is_private")]
            private_channels = [ch for ch in channels if ch.get("is_private")]

            message = "📋 **Channel Summary**\n"
            message += f"📢 Public Channels: {len(public_channels)}\n"
            message += f"🔒 Private Channels: {len(private_channels)}\n"
            message += f"📊 Total Channels: {len(channels)}\n\n"

            if public_channels:
                message += "**Public Channels:**\n"
                for ch in public_channels[:10]:  # Limit to first 10
                    member_count = ch.get("num_members", "?")
                    message += f"• #{ch['name']} ({member_count} members)\n"
                if len(public_channels) > 10:
                    message += f"... and {len(public_channels) - 10} more\n"

            await self._send_info_message(channel, message)

        except SlackApiError as e:
            await self._send_error_message(
                channel, f"Failed to list channels: {e.response['error']}"
            )

    async def _admin_list_users(self, channel: str, user: str, args: List[str]):
        """List all users in workspace"""
        try:
            users = self.web_client.users_list()["members"]
            active_users = [u for u in users if not u.get("deleted") and not u.get("is_bot")]
            admin_users = [u for u in active_users if u.get("is_admin") or u.get("is_owner")]

            message = "👥 **User Summary**\n"
            message += f"✅ Active Users: {len(active_users)}\n"
            message += f"👑 Admins/Owners: {len(admin_users)}\n"
            message += f"📊 Total Members: {len(users)}\n\n"

            if admin_users:
                message += "**Administrators:**\n"
                for u in admin_users:
                    role = "Owner" if u.get("is_owner") else "Admin"
                    status = "🟢" if u.get("presence") == "active" else "🔴"
                    message += f"• {status} {u.get('real_name', u.get('name'))} ({role})\n"

            await self._send_info_message(channel, message)

        except SlackApiError as e:
            await self._send_error_message(channel, f"Failed to list users: {e.response['error']}")

    async def _admin_workspace_info(self, channel: str, user: str, args: List[str]):
        """Get workspace information"""
        try:
            team_info = self.web_client.team_info()["team"]
            auth_info = self.web_client.auth_test()

            message = "🏢 **Workspace Information**\n"
            message += f"**Name:** {team_info.get('name')}\n"
            message += f"**Domain:** {team_info.get('domain')}\n"
            message += f"**ID:** {team_info.get('id')}\n"
            message += f"**Plan:** {team_info.get('plan', 'Unknown')}\n\n"
            message += "🤖 **Bot Information**\n"
            message += f"**User:** {auth_info.get('user')}\n"
            message += f"**User ID:** {auth_info.get('user_id')}\n"
            message += f"**Scopes:** {', '.join(auth_info.get('response_metadata', {}).get('scopes', []))}\n"

            await self._send_info_message(channel, message)

        except SlackApiError as e:
            await self._send_error_message(
                channel, f"Failed to get workspace info: {e.response['error']}"
            )

    # Helper Methods
    async def _send_success_message(self, channel: str, message: str):
        """Send a success message"""
        try:
            self.web_client.chat_postMessage(
                channel=channel, text=message, icon_emoji=":white_check_mark:"
            )
        except SlackApiError as e:
            logger.error("Failed to send success message", error=str(e))

    async def _send_error_message(self, channel: str, message: str):
        """Send an error message"""
        try:
            self.web_client.chat_postMessage(
                channel=channel, text=f"❌ {message}", icon_emoji=":x:"
            )
        except SlackApiError as e:
            logger.error("Failed to send error message", error=str(e))

    async def _send_info_message(self, channel: str, message: str):
        """Send an info message"""
        try:
            self.web_client.chat_postMessage(
                channel=channel, text=message, icon_emoji=":information_source:"
            )
        except SlackApiError as e:
            logger.error("Failed to send info message", error=str(e))

    async def _send_admin_help(self, channel: str):
        """Send admin help message"""
        help_text = """
🤖 **Candlefish Admin Bot - Available Commands**

**Channel Management:**
• `!admin create_channel <name> [private]` - Create a new channel
• `!admin delete_channel <name>` - Archive a channel
• `!admin list_channels` - List all channels

**User Management:**
• `!admin invite_user <user_id> <channel>` - Invite user to channel
• `!admin remove_user <user_id> <channel>` - Remove user from channel
• `!admin list_users` - List all workspace users

**Information:**
• `!admin workspace_info` - Get workspace details
• `!admin analytics` - Get workspace analytics
• `@admin_bot status` - Bot status and health

**Admin Features:**
• Full workspace administration
• Real-time event monitoring
• Comprehensive logging
• AWS Secrets Manager integration

Type `@admin_bot help` for this message.
        """
        await self._send_info_message(channel, help_text)

    async def _send_bot_status(self, channel: str):
        """Send bot status information"""
        status_text = f"""
🚀 **Bot Status Report**

**Connection:** {'✅ Connected' if self.running else '❌ Disconnected'}
**Socket Mode:** {'✅ Active' if self.socket_client else '❌ Disabled'}
**Token Type:** User OAuth Token
**Workspace:** {self.config.workspace_name}
**Admin Actions:** {len(self.admin_actions)} recorded
**Uptime:** {datetime.now().isoformat()}

**Capabilities:**
• ✅ Channel management
• ✅ User management
• ✅ Message posting
• ✅ Workspace analytics
• ✅ Real-time events
• ✅ Admin logging
        """
        await self._send_info_message(channel, status_text)

    def _log_admin_action(
        self,
        action_type: str,
        target: str,
        user_id: str,
        details: Dict[str, Any],
        success: bool,
        error_message: str = None,
    ):
        """Log an admin action"""
        action = AdminAction(
            action_type=action_type,
            target=target,
            user_id=user_id,
            timestamp=datetime.now(),
            details=details,
            success=success,
            error_message=error_message,
        )
        self.admin_actions.append(action)

        logger.info(
            "Admin action logged",
            action_type=action_type,
            target=target,
            user_id=user_id,
            success=success,
        )

    async def _verify_admin_capabilities(self):
        """Verify bot has admin capabilities"""
        logger.info("Verifying admin capabilities...")

        try:
            # Test basic API access
            auth_test = self.web_client.auth_test()
            logger.info("✅ Authentication successful", user=auth_test.get("user"))

            # Test channel listing
            channels = self.web_client.conversations_list()
            logger.info("✅ Channel access successful", count=len(channels["channels"]))

            # Test user listing
            users = self.web_client.users_list()
            logger.info("✅ User access successful", count=len(users["members"]))

            # Test team info
            team_info = self.web_client.team_info()
            logger.info("✅ Team info access successful", team=team_info["team"]["name"])

            logger.info("🚀 All admin capabilities verified successfully")

        except SlackApiError as e:
            logger.error("❌ Admin capability verification failed", error=e.response["error"])
            raise e

    async def _polling_mode(self):
        """Run in polling mode if Socket Mode is not available"""
        logger.info("Running in polling mode - limited functionality")
        while self.running:
            await asyncio.sleep(30)  # Poll every 30 seconds
            # Could implement polling for new messages, etc.

    def _signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        logger.info("Received shutdown signal", signal=signum)
        self.running = False

    async def stop(self):
        """Stop the bot gracefully"""
        logger.info("Stopping Candlefish Slack Admin Bot")
        self.running = False

        if self.socket_client:
            await self.socket_client.disconnect()

        # Save admin action log
        self._save_admin_log()

        logger.info("Bot stopped successfully")

    def _save_admin_log(self):
        """Save admin action log to file"""
        try:
            log_data = []
            for action in self.admin_actions:
                log_data.append(
                    {
                        "action_type": action.action_type,
                        "target": action.target,
                        "user_id": action.user_id,
                        "timestamp": action.timestamp.isoformat(),
                        "details": action.details,
                        "success": action.success,
                        "error_message": action.error_message,
                    }
                )

            with open("admin_actions.log", "w") as f:
                json.dump(log_data, f, indent=2)

            logger.info("Admin action log saved", actions=len(log_data))

        except Exception as e:
            logger.error("Failed to save admin log", error=str(e))


async def main():
    """Main entry point"""
    bot = SlackAdminBot()

    try:
        await bot.start()
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt")
    except Exception as e:
        logger.error("Unhandled exception", error=str(e))
    finally:
        await bot.stop()


if __name__ == "__main__":
    asyncio.run(main())
