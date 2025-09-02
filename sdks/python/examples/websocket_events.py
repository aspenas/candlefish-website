#!/usr/bin/env python3
"""
WebSocket events example for the Candlefish Claude Config Python SDK.

This example demonstrates:
- WebSocket connection setup
- Event handler registration
- Real-time configuration event monitoring
- Graceful connection handling

For more examples, visit: https://docs.candlefish.ai/sdks/python/examples
"""

import asyncio
import os
import signal
from typing import Optional

from candlefish_claude_config import (
    CandlefishClaudeConfigClient,
    WebSocketEvent
)


class ConfigurationMonitor:
    """Example configuration monitor using WebSocket events."""
    
    def __init__(self, api_key: str, tier: str = "Pro"):
        """Initialize the monitor."""
        self.client = CandlefishClaudeConfigClient(api_key=api_key, tier=tier)
        self.ws_client = self.client.get_websocket_client()
        self.running = False
    
    async def setup_event_handlers(self):
        """Set up event handlers for different configuration events."""
        
        # Handler for configuration creation events
        async def handle_config_created(event: WebSocketEvent):
            profile_name = event.payload.get('profile_name', 'Unknown')
            profile_id = event.payload.get('profile_id', 'Unknown')
            created_by = event.payload.get('created_by', 'Unknown')
            
            print(f"✨ New configuration created!")
            print(f"   Name: {profile_name}")
            print(f"   ID: {profile_id}")
            print(f"   Created by: {created_by}")
            print(f"   Timestamp: {event.timestamp}")
            print()
        
        # Handler for configuration update events
        async def handle_config_updated(event: WebSocketEvent):
            profile_name = event.payload.get('profile_name', 'Unknown')
            profile_id = event.payload.get('profile_id', 'Unknown')
            updated_by = event.payload.get('updated_by', 'Unknown')
            changes = event.payload.get('changes', [])
            
            print(f"🔄 Configuration updated!")
            print(f"   Name: {profile_name}")
            print(f"   ID: {profile_id}")
            print(f"   Updated by: {updated_by}")
            
            if changes:
                print(f"   Changes:")
                for change in changes[:3]:  # Show first 3 changes
                    print(f"     - {change}")
                if len(changes) > 3:
                    print(f"     ... and {len(changes) - 3} more changes")
            
            print(f"   Timestamp: {event.timestamp}")
            print()
        
        # Handler for configuration deletion events
        async def handle_config_deleted(event: WebSocketEvent):
            profile_name = event.payload.get('profile_name', 'Unknown')
            profile_id = event.payload.get('profile_id', 'Unknown')
            deleted_by = event.payload.get('deleted_by', 'Unknown')
            
            print(f"🗑️  Configuration deleted!")
            print(f"   Name: {profile_name}")
            print(f"   ID: {profile_id}")
            print(f"   Deleted by: {deleted_by}")
            print(f"   Timestamp: {event.timestamp}")
            print()
        
        # Handler for validation errors
        async def handle_config_error(event: WebSocketEvent):
            error_type = event.payload.get('error_type', 'Unknown')
            error_message = event.payload.get('message', 'Unknown error')
            profile_id = event.payload.get('profile_id')
            
            print(f"❌ Configuration error!")
            print(f"   Error type: {error_type}")
            print(f"   Message: {error_message}")
            if profile_id:
                print(f"   Profile ID: {profile_id}")
            print(f"   Timestamp: {event.timestamp}")
            print()
        
        # Handler for system maintenance events
        async def handle_system_maintenance(event: WebSocketEvent):
            maintenance_type = event.payload.get('maintenance_type', 'Unknown')
            expected_duration = event.payload.get('expected_duration', 'Unknown')
            message = event.payload.get('message', '')
            
            print(f"🔧 System maintenance!")
            print(f"   Type: {maintenance_type}")
            print(f"   Expected duration: {expected_duration}")
            if message:
                print(f"   Message: {message}")
            print(f"   Timestamp: {event.timestamp}")
            print()
        
        # Handler for authentication events
        async def handle_auth_token_refresh(event: WebSocketEvent):
            user_id = event.payload.get('user_id', 'Unknown')
            print(f"🔑 Authentication token refreshed for user: {user_id}")
            print(f"   Timestamp: {event.timestamp}")
            print()
        
        # Generic handler for unhandled events
        async def handle_unknown_event(event: WebSocketEvent):
            print(f"❓ Unknown event: {event.event_type}")
            print(f"   Payload: {event.payload}")
            print(f"   Timestamp: {event.timestamp}")
            print()
        
        # Register all event handlers
        self.ws_client.on_event("config.created", handle_config_created)
        self.ws_client.on_event("config.updated", handle_config_updated)
        self.ws_client.on_event("config.deleted", handle_config_deleted)
        self.ws_client.on_event("config.error", handle_config_error)
        self.ws_client.on_event("system.maintenance", handle_system_maintenance)
        self.ws_client.on_event("auth.token_refresh", handle_auth_token_refresh)
        
        print("📡 Event handlers registered:")
        print("   - config.created")
        print("   - config.updated")
        print("   - config.deleted")
        print("   - config.error")
        print("   - system.maintenance")
        print("   - auth.token_refresh")
        print()
    
    async def start_monitoring(self):
        """Start monitoring configuration events."""
        print("🚀 Starting configuration monitor...")
        print("   Press Ctrl+C to stop monitoring")
        print()
        
        try:
            # Set up event handlers
            await self.setup_event_handlers()
            
            self.running = True
            
            # Connect to WebSocket and start listening
            async with self.ws_client:
                print("🔌 Connected to Candlefish WebSocket API")
                print("⏳ Waiting for configuration events...")
                print()
                
                # Listen for events indefinitely
                async for event in self.ws_client.listen_for_events():
                    if not self.running:
                        break
                    
                    # Events are handled by registered handlers
                    # This loop just keeps the connection alive
                    pass
                    
        except KeyboardInterrupt:
            print("\n🛑 Monitoring stopped by user")
            
        except Exception as e:
            print(f"\n💥 Error during monitoring: {e}")
            
        finally:
            self.running = False
            print("🔌 WebSocket connection closed")
    
    def stop_monitoring(self):
        """Stop the monitoring loop."""
        self.running = False


async def main():
    """Main example function."""
    
    # Get API key from environment variable or replace with your key
    api_key = os.getenv("CANDLEFISH_API_KEY", "your-api-key-here")
    
    if api_key == "your-api-key-here":
        print("⚠️  Please set your API key in the CANDLEFISH_API_KEY environment variable")
        print("   or replace 'your-api-key-here' in this example")
        return
    
    # Create monitor instance
    monitor = ConfigurationMonitor(api_key, tier="Pro")
    
    # Set up signal handler for graceful shutdown
    def signal_handler(signum, frame):
        print(f"\n📡 Received signal {signum}, shutting down gracefully...")
        monitor.stop_monitoring()
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Test API connection first
    if not monitor.client.health_check():
        print("❌ API health check failed")
        return
    
    print("✅ API connection verified")
    
    # Start monitoring
    await monitor.start_monitoring()


if __name__ == "__main__":
    # Run the async main function
    asyncio.run(main())